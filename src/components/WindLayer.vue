<template>
  <div class="wind-layer">
    <canvas ref="canvasRef" class="wind-canvas"></canvas>
    <div v-if="isLoading" class="loading-indicator">Loading wind data...</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  map: Object,
  arrowDensity: {
    type: Number,
    default: 32 // Arrows per 1000px
  }
});

const canvasRef = ref(null);
let animationFrameId = null;
const ARROW_LENGTH = 12; // Fixed arrow length for uniformity
const isLoading = ref(false);
let loadingTimeout = null;

// Flow field parameters - defines how the wind pattern behaves
const flowParams = {
  scale: 0.01,         // Scale of the flow pattern (smaller = larger patterns)
  timeScale: 0.0001,   // How quickly the flow changes over time
  offset: Math.random() * 1000, // Random starting offset for variety
  noiseStrength: 0.1   // How much random noise to add to the flow
};

// Initialize the canvas and start drawing when component is mounted
onMounted(() => {
  if (canvasRef.value) {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    startDrawing();
    
    // Slowly animate the flow pattern over time (optional)
    setInterval(() => {
      flowParams.offset += 0.05;
      if (!isLoading.value) {
        startDrawing();
      }
    }, 5000); // Update every 5 seconds for subtle movement
  }
});

// Clean up event listeners on unmount
onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas);
  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId);
  }
  clearTimeout(loadingTimeout);
});

// Watch for map changes
watch(() => props.map, (newMap) => {
  if (newMap) {
    // Wait for Google Maps to be fully loaded
    setTimeout(startDrawing, 500);

    // Listen to map events - only redraw after operations complete
    newMap.addListener('dragstart', handleInteractionStart);
    newMap.addListener('dragend', handleInteractionEnd);
    newMap.addListener('zoom_changed', handleInteractionStart);
    newMap.addListener('idle', handleInteractionEnd);
  }
}, { immediate: true });

// Handle the start of map interaction (pan/zoom)
function handleInteractionStart() {
  isLoading.value = true;
  clearCanvas(); // Clear arrows during interaction
}

// Handle the end of map interaction
function handleInteractionEnd() {
  // Simulate API call with a short delay
  clearTimeout(loadingTimeout);
  loadingTimeout = setTimeout(() => {
    startDrawing();
    isLoading.value = false;
  }, 300); // 300ms delay to simulate API call
}

// Resize canvas to fill container
function resizeCanvas() {
  if (!canvasRef.value) return;
  
  const canvas = canvasRef.value;
  const container = canvas.parentElement;
  
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
  
  startDrawing();
}

// Clear the canvas
function clearCanvas() {
  if (!canvasRef.value) return;
  
  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Start drawing the wind arrows
function startDrawing() {
  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId);
  }
  
  animationFrameId = window.requestAnimationFrame(drawArrows);
}

// Generate coherent flow direction based on position
function getFlowDirection(x, y) {
  // Create a coherent flow field using sine waves
  // This creates smooth, natural-looking wind patterns
  const scale = flowParams.scale;
  const timeOffset = flowParams.offset * flowParams.timeScale;
  
  // Use multiple overlapping sine waves for more complex patterns
  const flowX = Math.sin(x * scale + timeOffset) + 
               Math.sin(y * 0.7 * scale + timeOffset * 0.8);
  const flowY = Math.cos(y * scale + timeOffset) + 
               Math.cos(x * 0.7 * scale + timeOffset * 0.8);
  
  // Convert to angle in radians
  let angle = Math.atan2(flowY, flowX);
  
  // Add a very small amount of randomness for natural variation
  angle += (Math.random() * flowParams.noiseStrength - flowParams.noiseStrength/2);
  
  return angle;
}

// Calculate the geographic bounding box of the current map view
function getMapBounds() {
  if (!props.map) return null;
  
  const bounds = props.map.getBounds();
  if (!bounds) return null;
  
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  
  return {
    north: ne.lat(),
    east: ne.lng(),
    south: sw.lat(),
    west: sw.lng()
  };
}

// Draw all arrows on the canvas based on geographic coordinates
function drawArrows() {
  if (!canvasRef.value || !props.map) return;
  
  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // Clear the canvas
  ctx.clearRect(0, 0, width, height);
  
  // Get the map bounds
  const bounds = getMapBounds();
  if (!bounds) return;
  
  // Calculate grid spacing using linear density (arrows per 1000px)
  const spacingX = 1000 / props.arrowDensity;
  const spacingY = 1000 / props.arrowDensity;
  
  // Calculate how many arrows we need in each dimension
  const numArrowsX = Math.ceil(width / spacingX);
  const numArrowsY = Math.ceil(height / spacingY);
  
  console.log(`Canvas size: ${width}x${height}, Grid: ${numArrowsX}x${numArrowsY}, Spacing: ${spacingX}x${spacingY}`);
  
  // Calculate lat/lng step size based on bounds and desired grid density
  const latStep = (bounds.north - bounds.south) / numArrowsY;
  const lngStep = (bounds.east - bounds.west) / numArrowsX;
  
  // Access the map projection for coordinate conversion
  const projection = props.map.getProjection();
  if (!projection) return;
  
  // Draw grid of arrows
  for (let i = 0; i < numArrowsX; i++) {
    for (let j = 0; j < numArrowsY; j++) {
      // Calculate geographic position based on grid
      const lng = bounds.west + (i + 0.5) * lngStep;
      const lat = bounds.north - (j + 0.5) * latStep;
      
      // Convert geographic coordinates to screen coordinates
      const latLng = new google.maps.LatLng(lat, lng);
      const point = projection.fromLatLngToPoint(latLng);
      const mapDiv = props.map.getDiv();
      const mapPoint = new google.maps.Point(
        point.x * Math.pow(2, props.map.getZoom()) - props.map.getProjection().fromLatLngToPoint(props.map.getCenter()).x * Math.pow(2, props.map.getZoom()) + mapDiv.offsetWidth / 2,
        point.y * Math.pow(2, props.map.getZoom()) - props.map.getProjection().fromLatLngToPoint(props.map.getCenter()).y * Math.pow(2, props.map.getZoom()) + mapDiv.offsetHeight / 2
      );
      
      const x = mapPoint.x;
      const y = mapPoint.y;
      
      // Check if the coordinates are within canvas bounds
      if (x >= 0 && x <= width && y >= 0 && y <= height) {
        // Generate coherent flow direction
        const direction = getFlowDirection(x, y);
        
        // Draw the arrow
        drawArrow(ctx, x, y, direction);
      }
    }
  }
}

// Draw a single arrow
function drawArrow(ctx, x, y, direction) {
  ctx.save();
  
  // Move to arrow position and rotate
  ctx.translate(x, y);
  ctx.rotate(direction);
  
  // Draw arrow shaft
  ctx.beginPath();
  ctx.moveTo(-ARROW_LENGTH / 2, 0);
  ctx.lineTo(ARROW_LENGTH / 2, 0);
  ctx.strokeStyle = 'rgba(87, 86, 86)';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // Draw arrow head
  ctx.beginPath();
  ctx.moveTo(ARROW_LENGTH / 2, 0);
  ctx.lineTo(ARROW_LENGTH / 2 - 5, -3);
  ctx.lineTo(ARROW_LENGTH / 2 - 5, 3);
  ctx.closePath();
  ctx.fillStyle = 'rgba(87, 86, 86)';
  ctx.fill();
  
  ctx.restore();
}
</script>

<style scoped>
.wind-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 100;
}

.wind-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.loading-indicator {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
}
</style> 
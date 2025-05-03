<template>
  <div class="map-container">
    <GMapMap
      :center="center"
      :zoom="10"
      map-type-id="terrain"
      class="google-map"
      ref="mapRef"
      @idle="onMapIdle"
    />
    <WindLayer 
      v-if="mapObject" 
      :map="mapObject" 
      :arrowDensity="32"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import WindLayer from './components/WindLayer.vue';

const center = ref({ lat: 40.7128, lng: -74.0060 }); // Default center (New York City)
const mapRef = ref(null);
const mapObject = ref(null);

// Handle map idle event to update map object
function onMapIdle() {
  if (mapRef.value && mapRef.value.$mapObject && !mapObject.value) {
    mapObject.value = mapRef.value.$mapObject;
    console.log('Map object updated', mapObject.value);
  }
}

// Make sure the map resizes when the window size changes
onMounted(() => {
  window.addEventListener('resize', () => {
    // Force a re-render
    center.value = { ...center.value };
  });

  // Check for map object with delay in case of slow loading
  setTimeout(() => {
    if (mapRef.value && mapRef.value.$mapObject) {
      mapObject.value = mapRef.value.$mapObject;
      console.log('Map object updated (delayed)', mapObject.value);
    }
  }, 1000);
});

// Get the Google Map instance after it's mounted
watch(mapRef, () => {
  if (mapRef.value && mapRef.value.$mapObject) {
    mapObject.value = mapRef.value.$mapObject;
    console.log('Map object updated (watch)', mapObject.value);
  }
}, { immediate: true });
</script>

<style>
/* Reset all styles */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Full viewport styles */
html, body {
  width: 100%;
  height: 100%;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}

#app {
  width: 100%;
  height: 100%;
  display: block;
  position: absolute;
  left: 0;
  top: 0;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}
</style>

<style scoped>
.map-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw !important;
  height: 100vh !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}

.google-map {
  width: 100% !important;
  height: 100% !important;
  z-index: 1;
}
</style>

<template>
  <div style="padding:24px">App tiny {{ buildStamp }}</div>
</template>
<script setup>
import { getBuildStamp } from './data'
const buildStamp = getBuildStamp() || ''
</script>

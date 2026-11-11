<template>
  <div style="padding:24px;font-family:serif">
    <h1>首页简版</h1>
    <p>共 {{ data?.total || 0 }} 方</p>
    <p>{{ data?.chapters?.length || 0 }} 章</p>
    <ul>
      <li v-for="ch in (data?.chapters || []).slice(0, 5)" :key="ch.id">{{ ch.name }} ({{ ch.formulas.length }})</li>
    </ul>
  </div>
</template>
<script setup>
defineProps({ data: { type: Object, required: true } })
</script>

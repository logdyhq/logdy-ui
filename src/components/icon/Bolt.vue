<script setup lang="ts">
const props = withDefaults(defineProps<{
    fill: string
    size: string
}>(), {
    fill: "currentColor",
    size: "14"
})
</script>
<template>
    <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 21.5L17.5 13L13 10L15 2.5L6.5 11L11 14L9 21.5Z" :fill="props.fill" />
    </svg>
</template>
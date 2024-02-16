<script setup lang="ts">
import { useFilterStore } from '../stores/filter';

const store = useFilterStore()
</script>
<template>
    <div class="facet">
        <div class="facet-header">
            <span class="facet-title">
                Filters</span>
            <span class="toggle"></span>
        </div>
        <div class="facet-items">
            <div class="facet-item" :class="{ 'facet-selected': store.filterToggle['read'] }"
                @click="store.toggleFilter('read')">
                <div class="facet-label">Read</div>
                <div class="facet-val">{{ store.filters.read }}</div>
            </div>
            <div class="facet-item" :class="{ 'facet-selected': store.filterToggle['unread'] }"
                @click="store.toggleFilter('unread')">
                <div class="facet-label">Unread</div>
                <div class="facet-val">{{ store.filters.unread }}</div>
            </div>
            <div class="facet-item" :class="{ 'facet-selected': store.filterToggle['starred'] }"
                @click="store.toggleFilter('starred')">
                <div class="facet-label">Marked</div>
                <div class="facet-val">{{ store.filters.starred }}</div>
            </div>
        </div>
    </div>
</template>
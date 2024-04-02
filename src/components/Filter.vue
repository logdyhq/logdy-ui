<script setup lang="ts">
import { computed } from 'vue';
import { useFilterStore } from '../stores/filter';

const store = useFilterStore()

const origins = computed(() => {
    let f: [string, number][] = []
    for (let i in store.filters) {
        if (i.startsWith('origin_')) {
            f.push([i, store.filters[i]])
        }
    }
    return f.sort((a, b) => {
        if (a[0] === 'origin_na') {
            return -1
        }
        return a[0] > b[0] ? 1 : -1
    })
})

const formatOriginLabel = (l: string) => {
    l = l.replace('origin_file_', 'File: ')
    l = l.replace('origin_port_', 'Port: ')
    l = l.replace('origin_na', 'N/A')
    return l
}

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
            <div class="facet-header">
                <span class="facet-title">
                    Origins</span>
                <span class="toggle"></span>
            </div>
            <div class="facet-item" :class="{ 'facet-selected': store.filterToggle[label] }"
                @click="store.toggleFilter(label)" v-for="[label, k]  in origins">
                <div class="facet-label">{{ formatOriginLabel(label) }}</div>
                <div class="facet-val">{{ k }}</div>
            </div>
        </div>
    </div>
</template>
<script lang="ts" setup>
import { computed } from 'vue';
import { FacetCollection, FacetValues } from '../types';

const props = defineProps<{
    facets: FacetValues
}>()

const toggleAll = (f: FacetCollection) => {
    let anySelected = Object.values(f.items).filter(v => v.selected).length > 0
    for (let i in f.items) {
        props.facets[f.name].items[i].selected = anySelected ? false : true
    }
}
const facetsSorted = computed(() => {
    return Object.values(props.facets).map(v => {
        [...v.items].sort((a, b) => {
            return a.count > b.count ? -1 : 1
        })
        return v
    })
})

const formatNumber = (num: number): string => {
    return Intl.NumberFormat('en-US', {
        notation: "compact",
        maximumFractionDigits: 1
    }).format(num)
}
</script>


<template>
    <div v-for="f in facetsSorted" class="facet">
        <div class="facet-header">
            <span class="facet-title" @click="f.toggled = !f.toggled">
                <span class="facet-toggle-vis" v-if="f.toggled">▼</span>
                <span class="facet-toggle-vis" v-else>►</span>
                {{ f.name }} ({{ Object.keys(f.items).length }})</span>
            <span class="facet-toggle" @click="toggleAll(f)">All</span>
        </div>
        <div v-if="f.toggled" class="facet-items">
            <div v-for="l in f.items" class="facet-item" @click="l.selected = !l.selected"
                :class="{ 'facet-selected': l.selected }">
                <div class="facet-label" :title="l.label">{{ l.label }}</div>
                <div class="facet-val" :title="l.count.toString()">{{ formatNumber(l.count) }}</div>
            </div>
        </div>
    </div>
    <div class="nofacets" v-if="facetsSorted.length === 0">
        No facets defined<br />
        <span>You can define facets per column in the settings</span>
    </div>
</template>

<style lang="scss" scoped></style>

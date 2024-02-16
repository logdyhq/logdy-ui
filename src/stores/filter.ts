import { defineStore } from "pinia";
import { computed, ref } from "vue";

export type Filters = "read" | "starred" | "unread"

export const getFilter = (): Record<Filters, number> => {
    return {
        read: 0,
        starred: 0,
        unread: 0
    }
}

export const useFilterStore = defineStore("filter", () => {

    const filterToggle = ref<Record<Filters, boolean>>({
        read: false,
        unread: false,
        starred: false,
    })
    const filters = ref<Record<Filters, number>>({ ...getFilter() })

    const changeFilter = (prop: Filters, delta: number) => {
        filters.value[prop] += delta
    }

    const toggleFilter = (prop: Filters) => {
        filterToggle.value[prop] = !filterToggle.value[prop]
    }

    const reset = () => {
        filters.value = { ...getFilter() }
    }

    const enabledFilters = computed(() => {
        let filters: Filters[] = []
        filterToggle.value.read && filters.push('read')
        filterToggle.value.unread && filters.push('unread')
        filterToggle.value.starred && filters.push('starred')
        return filters
    })

    return {
        filters,
        filterToggle,
        enabledFilters,

        reset,
        changeFilter,
        toggleFilter
    };
});
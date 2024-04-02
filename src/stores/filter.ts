import { defineStore } from "pinia";
import { computed, ref } from "vue";

export type Filters = "read" | "starred" | "unread" | string

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
        if (!filters.value[prop]) {
            filters.value[prop] = 0
        }
        filters.value[prop] += delta
    }

    const toggleFilter = (prop: Filters) => {
        filterToggle.value[prop] = !filterToggle.value[prop]
    }

    const reset = () => {
        filters.value = { ...getFilter() }
    }

    const enabledFilters = computed((): Filters[] => {
        let ret = Object.entries(filterToggle.value).filter(
            ([_, value]) => value
        ).map(v => v[0])
        return ret
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
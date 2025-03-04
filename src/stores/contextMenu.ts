import { defineStore } from "pinia";
import { ref } from "vue";
import { useMainStore } from "../store";
import { globalEventBus } from "../event_bus";

interface Action {
    label: string
    fn: () => void
    disabled?: () => boolean
}

interface ActionColumnHeader {
    type: "column_header", name: string
}
interface ActionCell {
    type: "cell", value: string, columnId: string
}

type ActionTypes = ActionColumnHeader | ActionCell


export const useContextMenuStore = defineStore("context_menu", () => {

    const show = (e: MouseEvent, type: ActionTypes) => {
        e.preventDefault();
        x.value = e.clientX + 1;
        y.value = e.clientY + 1;

        switch (type.type) {
            case "cell":
                const column = useMainStore().layout.getColumn(type.columnId)
                if (column?.faceted) {
                    let ff = useMainStore().facets[column.name].items.find(i => i.label == type.value)
                    let label = "Filter by facet"
                    if (ff?.selected) {
                        label = "Unfilter by facet"
                    }
                    actions.value?.push({
                        label,
                        fn: () => {
                            if (ff) {
                                ff.selected = !ff.selected
                            }
                            hide()
                        }
                    })
                }
                /**
                 * The feature of filtering by value is currently disabled due to the fact that 
                 * we're unable to effectively trace the source field only by using name.
                 * It requires a bigger change in functionality where we select a field to display in the column
                 * by allowing to provide it as a string path ie. `field.foo.bar` would correspond to {field:{foo:{bar:"baz"}}}
                 * In addition it should be taken into account when the object is flatten to {"field.foo.bar": "baz"}
                 */
                // actions.value?.push({
                //     label: "Search by value",
                //     fn: () => {
                //         let v = type.value
                //         switch (typeof v) {
                //             case "string":
                //                 v = `"${v}"`
                //                 break
                //             case "number":
                //             case "boolean":
                //                 v = `${v}`
                //                 break
                //         }
                //         globalEventBus.emit('searchbar-update', `data.${column.name} == ${v}`)
                //         hide()
                //     }
                // })
                actions.value?.push({
                    label: "Copy value",
                    fn: () => {
                        navigator.clipboard.writeText(type.value)
                        hide()
                    }
                })
                actions.value?.push({
                    label: "Copy column name",
                    fn: () => {
                        navigator.clipboard.writeText(column.name)
                        hide()
                    }
                })
                break
            case "column_header":
                actions.value?.push({
                    label: "Copy column name",
                    fn: () => {
                        navigator.clipboard.writeText(type.name)
                        hide()
                    }
                })
                actions.value?.push({
                    label: "Clear facet values",
                    fn: () => {
                        useMainStore().clearFacet(type.name)
                        hide()
                    },
                    disabled: () => !useMainStore().isFacetActive(type.name)
                })
                break
        }

        display.value = true
    }

    const hide = () => {
        display.value = false
        actions.value = []
    }

    const display = ref<Boolean>(false)

    const x = ref<Number>()
    const y = ref<Number>()

    const actions = ref<Action[]>([])


    return {
        show,
        hide,
        x,
        y,
        display,
        actions
    };
});
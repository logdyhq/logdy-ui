import { useMainStore } from "./store";

export const initKeyEventListeners = () => {

  const store = useMainStore()
  document.addEventListener("keydown", (event: KeyboardEvent) => {
    if (store.drawer.row) {
      if (event.code === 'Escape') {
        store.drawer.row = undefined
        return
      }

      if (event.code === 'ArrowUp') {
        event.preventDefault()
        store.openLogDrawer(store.drawer.idx! - 1)
        return
      }

      if (event.code === 'ArrowDown') {
        event.preventDefault()
        store.openLogDrawer(store.drawer.idx! + 1)
        return
      }
    }

  });

}
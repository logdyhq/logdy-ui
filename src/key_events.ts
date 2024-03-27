import { useMainStore } from "./store";

export const initKeyEventListeners = () => {

  const store = useMainStore()
  document.addEventListener("keydown", (event: KeyboardEvent) => {
    if (store.drawer.row) {
      if (event.code === 'Escape') {
        store.closeLogDrawer()
        return
      }

      if (event.code === 'ArrowUp') {
        event.preventDefault()
        store.openLogDrawer(store.drawer.row, -1)
        return
      }

      if (event.code === 'ArrowDown') {
        event.preventDefault()
        store.openLogDrawer(store.drawer.row, 1)
        return
      }
    }
    if (!store.settingsDrawer
      && !store.modalShow
      && event.code === 'Space') {
      event.preventDefault()
      if (store.receiveStatus === 'paused') {
        store.changeReceiveStatus('following')
      } else {
        store.changeReceiveStatus('paused')
      }
      return
    }

  });

}
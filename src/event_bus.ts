// eventBus.ts
import { reactive } from 'vue'

type EventCallback = (...args: any[]) => void
type EventDefinition = Record<string, any[]>

// Generic event bus creator function - similar to defineEmits pattern
export function defineEventBus<T extends EventDefinition>(_: T = {} as T) {
    // Type for event callbacks mapped to their parameter types
    type EventCallbacks = {
        [K in keyof T]: EventCallback
    }

    // Type-safe event listeners storage
    const listeners: {
        [K in keyof T]?: EventCallbacks[K][]
    } = {}

    const bus = reactive({
        // Register event listener with type checking
        on<K extends keyof T>(event: K, callback: EventCallbacks[K]) {
            if (!listeners[event]) {
                listeners[event] = []
            }
            listeners[event]!.push(callback)
            return () => bus.off(event, callback)
        },

        // Remove event listener
        off<K extends keyof T>(event: K, callback?: EventCallbacks[K]) {
            if (!listeners[event]) return
            if (!callback) {
                delete listeners[event]
                return
            }
            listeners[event] = listeners[event]!.filter(cb => cb !== callback)
        },

        // Emit event with type-checked arguments
        emit<K extends keyof T>(event: K, ...args: T[K]) {
            if (!listeners[event]) return
            listeners[event]!.forEach(callback => callback(...args))
        }
    })

    return bus
}

// Usage example: create a typed event bus
export type GlobalEvents = {
    'searchbar-update': [value: string]
}

// Create a global instance
export const globalEventBus = defineEventBus<GlobalEvents>()


// In component A.vue
// Usage example
// import { globalEventBus } from './eventBus'

// function userLogin() {
//   // Type checking ensures correct parameters
//   globalEventBus.emit('user:login', 'john_doe', Date.now())
  
//   // This would cause a TypeScript error - wrong parameter types
//   // globalEventBus.emit('user:login', 123, 'wrong')
// }

// // In component B.vue
// import { globalEventBus } from './eventBus'
// import { onMounted, onUnmounted } from 'vue'

// const loginHandler = (username: string, timestamp: number) => {
//   console.log(`${username} logged in at ${new Date(timestamp).toLocaleString()}`)
// }

// onMounted(() => {
//   // Store the unsubscribe function
//   const unsubscribe = globalEventBus.on('user:login', loginHandler)
  
//   // Alternative cleanup approach
//   onUnmounted(() => {
//     unsubscribe()
//     // Or: globalEventBus.off('user:login', loginHandler)
//   })
// })
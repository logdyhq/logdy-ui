import { ref } from "vue"

const theme = ref<"light" | "dark">()

const loadTheme = () => {
    let th = localStorage.getItem('theme')
    if (th == 'light') {
        theme.value = 'light'
    }
    if (th == 'dark') {
        theme.value = 'dark'
    }
}

const initTheme = () => {
    let theme = localStorage.getItem('theme')
    if (theme) {
        document.body.classList.add(theme)
    }
}

const toggleTheme = () => {
    let th = localStorage.getItem('theme')

    if (!th) {
        theme.value = 'dark'
        localStorage.setItem('theme', 'dark')
        document.body.classList.remove('light')
        document.body.classList.add('dark')
    }

    if (th == 'dark') {
        theme.value = 'light'
        localStorage.setItem('theme', 'light')
        document.body.classList.remove('dark')
        document.body.classList.add('light')
    } else {
        theme.value = 'dark'
        localStorage.setItem('theme', 'dark')
        document.body.classList.remove('light')
        document.body.classList.add('dark')
    }
}

export const themeHandler = {
    theme, loadTheme, toggleTheme, initTheme
}
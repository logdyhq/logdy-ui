import { ref } from "vue"

type ThemeValue = "light" | "dark"

const theme = ref<ThemeValue>()

const initTheme = () => {
    let theme = localStorage.getItem('theme')

    if (theme) {
        setTheme(theme as ThemeValue)
    } else {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark')
        }
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            setTheme('light')
        }
    }
}

const setTheme = (v: ThemeValue) => {
    theme.value = v
    localStorage.setItem('theme', v)
    if (v === 'dark') {
        document.body.classList.remove('light')
        document.body.classList.add('dark')
        document.body.setAttribute('data-theme', 'dark')
    }
    if (v === 'light') {
        document.body.classList.remove('dark')
        document.body.classList.add('light')
        document.body.setAttribute('data-theme', 'light')
    }
}

const toggleTheme = () => {
    let th = localStorage.getItem('theme')

    if (!th) {
        setTheme('dark')
    }

    if (th == 'dark') {
        setTheme('light')
    } else {
        setTheme('dark')
    }
}

export const themeHandler = {
    theme, toggleTheme, initTheme
}

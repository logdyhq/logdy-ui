<script setup lang="ts">
import { useMainStore } from '../store';

const hide = () => {

}

const remind = () => {

}

</script>

<template>
    <div class="update-bar" v-if="useMainStore().initSettings && useMainStore().initSettings?.updateVersion">
        <span>🎉 New Logdy v{{ useMainStore().initSettings?.updateVersion.current_version }} available! {{
            useMainStore().initSettings?.updateVersion.excerpt }} <a
                :href="useMainStore().initSettings?.updateVersion.blog_link"
                v-if="useMainStore().initSettings?.updateVersion.blog_link" target="_blank">Read
                more</a></span>
        <button @click="hide">Hide</button>
        <button @click="remind">Remind later</button>
    </div>
</template>

<style lang="scss">
.update {
    .top-bar {
        padding-top: 50px !important;
    }

    .layout {
        height: calc(100vh - 109px) !important;
    }
}

.update-bar {
    position: fixed;
    display: flex;
    align-items: center;
    justify-content: center;
    top: 0;

    width: 100%;

    height: 30px;
    font-size: 13px;
    background: #402c6b;
    border-bottom: 1px solid #583c93;

    span {
        margin-right: 20px;
    }

    button {
        padding: 3px 8px;
        font-size: 10px;
        border-radius: 7px;
        margin-right: 4px;
    }
}
</style>
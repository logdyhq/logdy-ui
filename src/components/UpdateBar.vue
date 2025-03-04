<script setup lang="ts">
import { useNotificationBarStore } from '../stores/notificationBar';

const store = useNotificationBarStore()

</script>

<template>
    <div class="update-bar" v-if="store.updateResponse">
        <span>🎉 New Logdy v{{ store.updateResponse.current_version }} available! {{
            store.updateResponse.excerpt }} <a :href="store.updateResponse.blog_link"
                v-if="store.updateResponse.blog_link" target="_blank">Read
                more</a></span>
        <button @click="store.hide">Hide</button>
        <button @click="store.remindLater">Remind later</button>
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
        border-radius: 4px;
        margin-right: 4px;
    }
}
</style>
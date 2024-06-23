<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useMainStore } from '../store';
import { client } from "../api"

const pass = ref<string>("")
const input = ref<HTMLInputElement>()
const loading = ref<boolean>()
const msg = ref<string>()
const remember = ref<boolean>(true)

const emit = defineEmits<{
    (e: 'success'): void,
}>()

onMounted(() => {
    input.value?.focus()
})

const submit = async () => {
    msg.value = ""
    loading.value = true
    let res = await client.sendGet("check-pass?password=" + pass.value)

    loading.value = false
    if (res.status == 200) {
        useMainStore().setPassword(pass.value.toString(), remember.value)
        emit('success')
        return
    }

    msg.value = "Password failed, please try again"
}

</script>
<template>
    <div style="font-size:20px; margin-bottom: 10px">Authentication</div>
    <div style="margin-bottom: 10px">To access Logdy you need to provide a password. <a href="https://logdy.dev">What is
            Logdy?</a></div>
    <div>
        <input class="input" ref="input" v-model="pass" type="text" style="min-width: 400px;" @keyup.enter="submit" />
    </div>
    <div v-if="loading">loading...</div>
    <div style="margin-top: 10px">
        <input type="checkbox" v-model="remember" id="ch" /> <label for="ch">Remember password</label>
    </div>
    <div class="err" v-if="msg">
        {{ msg }}
    </div>
    <div style="margin-top: 10px">
        <button :disabled="pass?.length === 0" class="btn" @click="submit">Submit</button>
    </div>
</template>

<style lang="scss">
.input {
    font-family: 'Roboto mono', sans-serif;
    font-size: 12px;
    padding: 5px;
    -webkit-box-sizing: border-box;
    -moz-box-sizing: border-box;
    -o-box-sizing: border-box;
    -ms-box-sizing: border-box;
    box-sizing: border-box;
}

.err {
    padding: 10px;
    margin: 10px 0;
    background: rgb(181, 60, 60);
}
</style>
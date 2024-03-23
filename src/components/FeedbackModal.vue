<script setup lang="ts">
import { onMounted, ref } from 'vue';

const email = ref<string>("")
const content = ref<string>("")
const loading = ref<boolean>(false)
const success = ref<boolean>(false)

onMounted(() => {

    //@ts-expect-error
    document.JSONP = (function (document) {
        var requests = 0,
            callbacks = {};

        return {
            /**
             * makes a JSONP request
             *
             * @param {String} src
             * @param {Object} data
             * @param {Function} callback
             */
            get: function (src: string, data: any, callback: any) {
                // check if data was passed
                if (!arguments[2]) {
                    callback = arguments[1];
                    data = {};
                }

                // determine if there already are params
                src += (src.indexOf('?') + 1 ? '&' : '?');

                var head = document.getElementsByTagName('head')[0],
                    script = document.createElement('script'),
                    params = [],
                    param;

                // increment the requests
                requests++;

                // create external callback name
                // data.callback = 'JSONP.callbacks.request_' + requestId;
                data.callback = 'cb'

                // set callback function
                // callbacks['request_' + requestId] = function (data) {
                //@ts-expect-error
                callbacks['cb'] = function (data: any) {
                    // clean up
                    head.removeChild(script);
                    //@ts-expect-error
                    delete callbacks['cb'];

                    // fire callback
                    callback(data);
                };

                // traverse data
                for (param in data) {
                    params.push(param + '=' + encodeURIComponent(data[param]));
                }

                // generate params
                src += params.join('&');

                // set script attributes
                script.type = 'text/javascript';
                script.src = src;

                // add to the DOM
                head.appendChild(script);
            },

            /**
             * keeps a public reference of the callbacks object
             */
            callbacks: callbacks
        };
    })(document);

})

const submit = async () => {

    loading.value = true

    await new Promise(resolve => {
        //@ts-expect-error
        document.JSONP.get('https://eoutbn4ig0dwes4.m.pipedream.net', { email: email.value, content: content.value }, function (data) {
            resolve(data)
        });
    })

    loading.value = false
    success.value = true
    email.value = ''
    content.value = ''
}
</script>

<template>
    <div style="margin-top: 10px">

        You can leave feedback or report a bug by filling the form below.
        The message will be submitted to the Logdy team directly.
        Consider also opening a <a href="https://github.com/logdyhq/logdy-core/issues/new" target="_blank">Github Issue</a>.

        <br />
        <br />

        Email (optional): <input type="text" class="input" name="email" v-model="email">

        <textarea v-model="content" placeholder="Leave feedback or error description here" rows="5" class="input"
            style="width:100%;max-height:200px; overflow: scroll; overflow-x: hidden; margin-bottom: 10px; margin-top: 10px;"></textarea>

        <button @click="submit" :disabled="loading || content.length === 0">Submit</button>

        <div class="alert alert-success" v-if="success">Message has been sent!</div>
    </div>
</template>
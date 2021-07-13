<template>
  <img alt="Vue logo" src="./assets/logo.png" />
  {{ name }}
  <button>这是一个按钮</button>
  <HelloWorld msg="Hello Vue 3 + TypeScript + Vite" />
</template>

<script lang="ts">
import { defineComponent } from "vue";
import HelloWorld from "./components/HelloWorld.vue";

export default defineComponent({
  name: "App",
  // data() {
  //   return {
  //     name: 'saber'
  //   }
  // },
  setup(){
    return {
      name: 'kurama'
    }
  },
  components: {
    HelloWorld,
  },
});
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>

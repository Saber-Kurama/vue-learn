<template>
  <h1>{{ msg }}</h1>

  <p>
    Recommended IDE setup:
    <a href="https://code.visualstudio.com/" target="_blank">VSCode</a>
    +
    <a
      href="https://marketplace.visualstudio.com/items?itemName=octref.vetur"
      target="_blank"
    >Vetur</a>
    or
    <a href="https://github.com/johnsoncodehk/volar" target="_blank">Volar</a>
    (if using
    <code>&ltscript setup&gt;</code>)
  </p>

  <p>See <code>README.md</code> for more information.</p>

  <p>
    <a href="https://vitejs.dev/guide/features.html" target="_blank">Vite Docs</a> |
    <a href="https://v3.vuejs.org/" target="_blank">Vue 3 Docs</a>
  </p>
  <div>{{countNum}}</div>
  <button @click="addCount">count is: {{ count }}</button>
  <p>
    Edit
    <code>components/HelloWorld.vue</code> to test hot module replacement.
  </p>
</template>

<script lang="ts">
import { ref, defineComponent, computed, reactive, toRefs, onBeforeMount, watch } from 'vue'
import useGetCount from './useGetCount'
// import useMaping form './userMaping';
export default defineComponent({
  name: 'HelloWorld',
  props: {
    msg: {
      type: String,
      required: true
    }
  },
  setup: (props, context) => {
    onBeforeMount(() => {
      console.log('onBeforeMount')
    })
    // watch([firstName, lastName], ([newFirst, oldFirst], [newLast, oldLast]) => {

    // },{immediate: true})
    // ref 方式
    // const count = ref(0)
    // const addCount = () => {
    //   count.value ++ 
    // }
    // const countNum = computed(() => {
    //   return '结果'+ count.value
    // })
    // return { count, addCount, countNum }
    // reactive 方法 
    // const obj = reactive({
    //   count: 0
    // })
    // const addCount = () => {
    //   obj.count ++
    // }
    // const countNum = computed(() => {
    //   return '结果'+ obj.count
    // })
    // return {...toRefs(obj), addCount, countNum}

    
    // return useGetCount()

    // // 这种简单的写法不好，不能明确的知道需要什么，以及那些方法从那里来的
    // return {
    //   ...useGetCount(),
    //   // ...useMaping(),
    // }
    // 最清楚的可以看到依赖的办法
    const {count, countNum, addCount} = useGetCount()
    // const {xxx} = useMaping()
    return {
      count,
      countNum,
      addCount,
      // xxx
    }
  }
})
// function useGetCount () {
//   const obj = reactive({
//       count: 0
//     })
//     const addCount = () => {
//       obj.count ++
//     }
//     const countNum = computed(() => {
//       return '结果'+ obj.count
//     })
//     return {...toRefs(obj), addCount, countNum}
// }
</script>

<style scoped>
a {
  color: #42b983;
}

label {
  margin: 0 0.5em;
  font-weight: bold;
}

code {
  background-color: #eee;
  padding: 2px 4px;
  border-radius: 4px;
  color: #304455;
}
</style>

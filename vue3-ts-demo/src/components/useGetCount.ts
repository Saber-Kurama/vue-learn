import { computed, reactive, toRefs } from 'vue'
export default function useGetCount () {
    const obj = reactive({
        count: 0
      })
      const addCount = () => {
        obj.count ++
      }
      const countNum = computed(() => {
        return '结果'+ obj.count
      })
      return {...toRefs(obj), addCount, countNum}
  }
// import { reactive } from '../packages/reactivity/src/index'
declare const __DEV__: any

// export namespace NodeJS {
//   interface Global {
//     myGlobal: number
//   }

// }
declare module NodeJS  {
  interface Global {
      __DEV__: any
  }
}

// Set `__DEV__` to true to indicate that current mode
// is development rather than production
global.__DEV__ = false 
// import { reactive } from '../packages/reactivity/src/index'
// global.__DEV__ = false
console.log('__DEV__', __DEV__)
// const count = reactive({count: 5})
var VueReactivity = (function (exports) {
    'use strict';

    const isObject = (value) => typeof value == 'object' && value !== null;
    const extend = Object.assign;
    const isArray = Array.isArray;
    const isFunction = (value) => typeof value == 'function';
    const isIntegerKey = (key) => parseInt(key) + '' === key;
    let hasOwnpRroperty = Object.prototype.hasOwnProperty;
    const hasOwn = (target, key) => hasOwnpRroperty.call(target, key);
    const hasChanged = (oldValue, value) => oldValue !== value;

    function effect(fn, options = {}) {
        // 我需要让这个effect变成响应的effect，可以做到数据变化重新执行 
        const effect = createReactiveEffect(fn, options);
        if (!options.lazy) { // 默认的effect会先执行
            effect(); // 响应式的effect默认会先执行一次
        }
        return effect;
    }
    let uid = 0;
    let activeEffect; // 存储当前的effect
    const effectStack = [];
    function createReactiveEffect(fn, options) {
        const effect = function reactiveEffect() {
            if (!effectStack.includes(effect)) { // 保证effect没有加入到effectStack中
                try {
                    effectStack.push(effect);
                    activeEffect = effect;
                    return fn(); // 函数执行时会取值  会执行get方法
                }
                finally {
                    effectStack.pop();
                    activeEffect = effectStack[effectStack.length - 1];
                }
            }
        };
        effect.id = uid++; // 制作一个effect标识 用于区分effect
        effect._isEffect = true; // 用于标识这个是响应式effect
        effect.raw = fn; // 保留effect对应的原函数
        effect.options = options; // 在effect上保存用户的属性
        return effect;
    }
    // 让，某个对象中的属性 收集当前他对应的effect函数
    const targetMap = new WeakMap();
    function track(target, type, key) {
        //  activeEffect; // 当前正在运行的effect
        if (activeEffect === undefined) { // 此属性不用收集依赖，因为没在effect中使用
            return;
        }
        let depsMap = targetMap.get(target);
        if (!depsMap) {
            targetMap.set(target, (depsMap = new Map));
        }
        let dep = depsMap.get(key);
        if (!dep) {
            depsMap.set(key, (dep = new Set));
        }
        if (!dep.has(activeEffect)) {
            dep.add(activeEffect);
        }
    }
    // 找属性对应的effect 让其执行 （数组、对象）
    function trigger(target, type, key, newValue, oldValue) {
        // 如果这个属性没有 收集过effect，那不需要做任何操作
        const depsMap = targetMap.get(target);
        if (!depsMap)
            return;
        const effects = new Set(); // 这里对effect去重了
        const add = (effectsToAdd) => {
            if (effectsToAdd) {
                effectsToAdd.forEach(effect => effects.add(effect));
            }
        };
        // 我要将所有的 要执行的effect 全部存到一个新的集合中，最终一起执行
        // 1. 看修改的是不是数组的长度 因为改长度影响比较大
        if (key === 'length' && isArray(target)) {
            // 如果对应的长度 有依赖收集需要更新
            depsMap.forEach((dep, key) => {
                if (key === 'length' || key > newValue) { // 如果更改的长度 小于收集的索引，那么这个索引也需要触发effect重新执行
                    add(dep);
                }
            });
        }
        else {
            // 可能是对象
            if (key !== undefined) { // 这里肯定是修改， 不能是新增
                add(depsMap.get(key)); // 如果是新增
            }
            // 如果修改数组中的 某一个索引 怎么办？
            switch (type) { // 如果添加了一个索引就触发长度的更新
                case 0 /* ADD */:
                    if (isArray(target) && isIntegerKey(key)) {
                        add(depsMap.get('length'));
                    }
            }
        }
        effects.forEach((effect) => {
            if (effect.options.scheduler) {
                effect.options.scheduler(effect);
            }
            else {
                effect();
            }
        });
    }
    // weakMap {name:'zf',age:12}  (map) =>{name => set(effect),age => set(effect)}
    // {name:'zf',age:12} => name => [effect effect]
    // 函数调用是一个栈型结构
    // effect(()=>{ // effect1   [effect1]
    //     state.name -> effect1
    //     effect(()=>{ // effect2
    //         state.age -> effect2
    //     })
    //     state.address -> effect1
    // })

    // get 逻辑
    // 针对 浅拷贝和readonly 的一些处理，另外是收集依赖
    const get = createGetter(false, false);
    const shallowGet = createGetter(false, true);
    const readonlyGet = createGetter(true);
    const showllowReadonlyGet = createGetter(true, true);
    // set 
    // readonly 不能赋值， 另外就是 触发 依赖的 effect
    const set = createSetter();
    const shallowSet = createSetter(true);
    // 
    const mutableHandlers = {
        get,
        set
    };
    const shallowReactiveHandlers = {
        get: shallowGet,
        set: shallowSet
    };
    let readonlyObj = {
        set: (target, key) => {
            console.warn(`set on key ${key} falied`);
        }
    };
    const readonlyHandlers = extend({
        get: readonlyGet,
    }, readonlyObj);
    const shallowReadonlyHandlers = extend({
        get: showllowReadonlyGet,
    }, readonlyObj);
    function createGetter(isReadonly = false, shallow = false) {
        // 这个最好返回箭头函数
        return function get(target, key, receiver) {
            const res = Reflect.get(target, key, receiver);
            if (!isReadonly) {
                // 执行 收集依赖
                track(target, 0 /* GET */, key);
            }
            // 浅拷贝
            if (shallow) {
                return res;
            }
            if (isObject(res)) {
                return isReadonly ? readonly(res) : reactive(res);
            }
            return res;
        };
    }
    function createSetter(shallow = false) {
        return function set(target, key, value, receiver) {
            const oldValue = target[key]; // 获取老的值
            let hadKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);
            const result = Reflect.set(target, key, value, receiver); // target[key] = value
            if (!hadKey) {
                // 新增 
                trigger(target, 0 /* ADD */, key, value);
            }
            else if (hasChanged(oldValue, value)) {
                // 修改 
                trigger(target, 1 /* SET */, key, value);
            }
            // 我们要区分是新增的 还是修改的  vue2 里无法监控更改索引，无法监控数组的长度变化  -》 hack的方法 需要特殊处理
            // 当数据更新时 通知对应属性的effect重新执行
            return result;
        };
    }

    const reactive = (target) => {
        return createReactiveObject(target, false, mutableHandlers);
    };
    const shallowReactive = (target) => {
        return createReactiveObject(target, false, shallowReactiveHandlers);
    };
    const shallowReadonly = (target) => {
        return createReactiveObject(target, true, readonlyHandlers);
    };
    const readonly = (target) => {
        return createReactiveObject(target, true, shallowReadonlyHandlers);
    };
    const reactiveMap = new WeakMap(); // 会自动垃圾回收，不会造成内存泄漏， 存储的key只能是对
    const readonlyMap = new WeakMap();
    function createReactiveObject(target, isReadonly, baseHandlers) {
        // 如果目标不是对象 没法拦截了，reactive这个api只能拦截对象类型
        // 其他的边界考虑
        if (!isObject(target)) {
            return target;
        }
        const proxyMap = isReadonly ? readonlyMap : reactiveMap;
        const existProxy = proxyMap.get(target);
        if (existProxy) {
            return existProxy; // 如果已经被代理了 直接返回即可
        }
        console.log('baseHandlers', baseHandlers);
        const proxy = new Proxy(target, baseHandlers);
        proxyMap.set(target, proxy);
        return proxy;
    }

    function ref(value) {
        // 将普通类型变相一个对象， 使用 对象的 get set 方法
        return createRef(value);
    }
    function shallowRef(value) {
        return createRef(value, true);
    }
    const convert = (val) => (isObject(val) ? reactive(val) : val);
    class RefImpl {
        rawValue;
        shallow;
        _value;
        __v_isRef = true; // 产生的实例会被添加 __v_isRef 表示是一个ref属性
        constructor(rawValue, shallow) {
            this.rawValue = rawValue;
            this.shallow = shallow;
            this._value = shallow ? rawValue : convert(rawValue);
        }
        get value() {
            track(this, 0 /* GET */, "value");
            return this._value;
        }
        set value(newValue) {
            if (hasChanged(newValue, this.rawValue)) {
                // 判断老值和新值是否有变化
                this.rawValue = newValue; // 新值会作为老值
                this._value = this.shallow ? newValue : convert(newValue);
                trigger(this, 1 /* SET */, "value", newValue);
            }
        }
    }
    function createRef(rawValue, shallow = false) {
        return new RefImpl(rawValue, shallow);
    }
    class ObjectRefImpl {
        target;
        key;
        __v_isRef = true;
        constructor(target, key) {
            this.target = target;
            this.key = key;
        }
        get value() {
            return this.target[this.key]; // 如果原对象是响应式的就会依赖收集
        }
        set value(newValue) {
            this.target[this.key] = newValue; // 如果原来对象是响应式的 那么就会触发更新
        }
    }
    // 将响应式对象的某一个key对应的值 转化成ref 
    function toRef(target, key) {
        return new ObjectRefImpl(target, key);
    }
    function toRefs(object) {
        const ret = isArray(object) ? new Array(object.length) : {};
        for (let key in object) {
            ret[key] = toRef(object, key);
        }
        return ret;
    }

    class ComputedRefImpl {
        setter;
        _dirty = true;
        _value;
        effect;
        constructor(getter, setter) {
            this.setter = setter;
            this.effect = effect(getter, {
                lazy: true,
                scheduler: () => {
                    // 走到这一步的话 证明 值反生修改
                    if (!this._dirty) {
                        console.log('>>>');
                        this._dirty = true;
                        trigger(this, 1 /* SET */, 'value');
                    }
                }
            });
        }
        get value() {
            // 执行 effect
            trigger(this, 1 /* SET */, 'value');
            if (this._dirty) {
                this._value = this.effect();
                this._dirty = false;
            }
            track(this, 0 /* GET */, 'value');
            return this._value;
        }
        set value(newValue) {
            this.setter(newValue);
        }
    }
    /**
     *  接受 getter setter 或者一个 function
     */
    function computed(getterOrOptions) {
        let getter;
        let setter;
        if (isFunction(getterOrOptions)) {
            getter = getterOrOptions;
            setter = () => {
                console.warn("computed value must be readonly");
            };
        }
        else {
            getter = getterOrOptions.get;
            setter = getterOrOptions.set;
        }
        return new ComputedRefImpl(getter, setter);
    }

    exports.computed = computed;
    exports.effect = effect;
    exports.reactive = reactive;
    exports.readonly = readonly;
    exports.ref = ref;
    exports.shallowReactive = shallowReactive;
    exports.shallowReadonly = shallowReadonly;
    exports.shallowRef = shallowRef;
    exports.toRef = toRef;
    exports.toRefs = toRefs;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

}({}));
//# sourceMappingURL=reactivity.global.js.map

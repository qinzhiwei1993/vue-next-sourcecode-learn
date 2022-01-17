



const effectStacks = [] // 存放当前正处于渲染期间的视图，便于将依赖放入对应的effect中
const targetMap = new Map() // 用于存放收集的依赖对象
// 收集依赖
const track = (target, key) => {
    const effect = effectStacks[effectStacks.length - 1]
    if (effect) {
        let depMap = targetMap.get(target)
        if (depMap === undefined) {
            depMap = new Map()
        }
        targetMap.set(target, depMap)
        let deps = depMap.get(key)
        if (deps === undefined) {
            deps = new Set()

        }
        deps.add(effect)
        depMap.set(key, deps)
        effect.deps.push(deps) // 双向收集，便于去重，这里只是核心代码，并没有考虑去重
    }
}

// 触发更新
const trigger = (target, key) => {
    let depMap = targetMap.get(target)
    if (depMap.get(key)) {
        const deps = depMap.get(key)
        deps.forEach(effect => {
            if(!effect.lazy){
                effect()
            }
        })
    }
}

const reactive = (target) => {
    const observed = new Proxy(target, {
        get(target, key) {
            // 收集依赖
            track(target, key)
            return Reflect.get(target, key)
        },
        set(target, key, val) {
            // 触发更新
            Reflect.set(target, key, val)
            return trigger(target, key)
        }
    })

    return observed
}

// 执行函数
const run = (effect, fn) => {
    if (effectStacks.indexOf(effect) === -1) {
        effectStacks.push(effect)
        try {
            return fn()
        } finally {
            // 执行完之后，需要将effectStacks清空
            effectStacks.pop()
        }
    }
}


// 创建effect
const createReactiveEffect = (fn, options) => {
    const effect = () => {
        return run(effect, fn)
    }
    effect.deps = []
    effect.lazy = options.lazy
    effect.computed = options.computed
    return effect
}


const computed = (fn) => {
    const runner = effect(fn, { lazy: true, computed: true })
    return {
        effect: runner,
        get value() {
            return runner()
        }
    }
}


const effect = (fn, options = {}) => {
    const e = createReactiveEffect(fn, options)
    if (!options.lazy) {
        e()
    }
    return e
}
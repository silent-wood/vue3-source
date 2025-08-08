export let activeEffect = undefined

function cleanupEffect(effect) {
	let { deps } = effect
	let len = deps.length
	for(let i = 0; i < len; i++) {
		deps[i].delete(effect)
	}
	// 清空依赖列表
	effect.deps.length = 0
}

class ReactiveEffect {
	_trackId = 0; // 用于记录当前effect执行了几次
	public active = true // 创建的effect是响应式的
	deps = [] // [new Set(), new Set] 记录effect依赖的属性列表
	_depsLength = 0
	constructor(public fn, public scheduler) { }
	run() {
		if (!this.active) return this.fn();
		let lastEffect = activeEffect;
		try {
			activeEffect = this
			// 在执行之前清理effect，运行run的时候重新收集一次依赖
			// cleanupEffect(this);
			// 当函数执行的时候需要将对应的effect和属性关联起来
			return this.fn() // 触发属性的get
		} finally {
			this.active = lastEffect;
		}
	}
	stop() {
		this.active = false
	}
}


// 双向记忆
export function trackEffect(effect, dep) {
  dep.set(effect, effect._trackId);
  // 让effect和dep进行关联
  effect.deps[effect._depsLength++] = dep
}

export function triggerEffects(dep) {
  for (const effect of dep.keys()) {
    if (effect.scheduler) {
      effect.scheduler();
    }
  }
}

export function effect(fn, options) {
	// 创建一个effect，只要依赖的属性发生变化就执行回调
	const _effect = new ReactiveEffect(fn, () => {
		_effect.run()
	});
	// 默认让用户的函数执行一次
	_effect.run()
}
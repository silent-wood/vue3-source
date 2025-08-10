export let activeEffect = undefined

function preCleanupEffect(effect) {
	effect._depsLength = 0;
	effect._trackId++; // 每次执行+1，同一个effect执行，id就是相同的
}

function postCleanupEffect(effect) {
	if (effect.deps.length > effect._depsLength) {
		for (let i = effect._depsLength; i < effect.deps.length; i++) {
			cleanDepEffect(effect.deps[i], effect); // 删除映射表中对应的effect
		}
		effect.deps.length = effect._depsLength; // 更新依赖列表的长度
	}
}

class ReactiveEffect {
	_trackId = 0; // 用于记录当前effect执行了几次，防止一个属性多次访问，只收集一次
	deps = [] // [new Set(), new Set] 记录effect依赖的属性列表
	_depsLength = 0
	public active = true // 创建的effect是响应式的
	constructor(public fn, public scheduler) { }
	run() {
		if (!this.active) return this.fn();
		let lastEffect = activeEffect;
		try {
			activeEffect = this
			// 在执行之前清理effect，运行run的时候重新收集一次依赖
			preCleanupEffect(this);
			// 当函数执行的时候需要将对应的effect和属性关联起来
			return this.fn() // 依赖收集
		} finally {
			postCleanupEffect(this);
			activeEffect = lastEffect;
		}
	}
	stop() {
		this.active = false
	}
}

// 删除依赖
function cleanDepEffect(dep, effect) {
	dep.delete(effect);
	if (dep.size === 0) {
		// 清空依赖
		dep.cleanup()
	}
}

// 双向记忆
export function trackEffect(effect, dep) {
	// 避免同一个属性的同一个effect多次收集
	if (dep.get(effect) !== effect._trackId) {
		dep.set(effect, effect._trackId); // 更新id
		let oldDep = effect.deps[effect._depsLength];
		if (oldDep !== dep) {
			if (oldDep) { // 删掉老的
				cleanDepEffect(oldDep, effect);
			}
			effect.deps[effect._depsLength++] = dep; // 按照最新的存放
		} else {
			effect._depsLength++;
		}
	}
	// dep.set(effect, effect._trackId);
	// // 让effect和dep进行关联
	// effect.deps[effect._depsLength++] = dep
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
	_effect.run();
	// if (options) {
	// 	Object.assign(_effect, options); // 用户自己传递的配置
	// }
	// const runner = _effect.run.bind(_effect);
	// runner.effect = _effect;
	// // 默认让用户的函数执行一次
	// return runner
}
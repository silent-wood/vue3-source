import { DirtyLevels } from "./constants";

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

export class ReactiveEffect {
	_trackId = 0; // 用于记录当前effect执行了几次，防止一个属性多次访问，只收集一次
	_depsLength = 0
  _running = 0 // 是否正在执行
	_dirtyLevel = DirtyLevels.Dirty // 默认是脏的
	deps = [] // [new Set(), new Set] 记录effect依赖的属性列表
	public active = true // 创建的effect是响应式的
	constructor(public fn, public scheduler) { 
		// fn是用户传递的函数，
		// scheduler是调度函数,当fn中收集到的依赖发生变化后，会在proxy的set中触发trigger，triggerEffect中会调用scheduler执行

	 }

	public get dirty() {
		return this._dirtyLevel === DirtyLevels.Dirty
	}

	public set dirty(value) {
		this._dirtyLevel = value ? DirtyLevels.Dirty : DirtyLevels.NoDirty
	}

	run() {
		this._dirtyLevel = DirtyLevels.NoDirty; // 执行之前设置为不脏
		if (!this.active) return this.fn();
		let lastEffect = activeEffect;
		try {
			activeEffect = this
			// 在执行之前清理effect，运行run的时候重新收集一次依赖
			preCleanupEffect(this);
			this._running++;
			// 当函数执行的时候需要将对应的effect和属性关联起来
			return this.fn() // 依赖收集
		} finally {
			this._running--;
			postCleanupEffect(this);
			activeEffect = lastEffect;
		}
	}
	stop() {
		if (this.active) {
			this.active = false;
			preCleanupEffect(this);
			postCleanupEffect(this);
		}
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
}

export function triggerEffects(dep) {
	for (const effect of dep.keys()) {
		// 如果当前这个值不是脏的，但是触发更新需要将值变为脏值
		if (effect._dirtyLevel < DirtyLevels.Dirty) {
			effect._dirtyLevel = DirtyLevels.Dirty;
		}

		if (!effect._running) {
			if (effect.scheduler) {
				effect.scheduler();
			}
		}
	}
}

export function effect(fn, options) {
	// 创建一个effect，只要依赖的属性发生变化就执行回调
	const _effect = new ReactiveEffect(fn, () => {
		_effect.run()
	});
	_effect.run();
	if (options) {
		Object.assign(_effect, options); // 用户自己传递的配置
	}
	const runner = _effect.run.bind(_effect);
	runner.effect = _effect;
	// 默认让用户的函数执行一次
	return runner
}
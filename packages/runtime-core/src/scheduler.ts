const queue = []; // 缓存要执行的队列
let isFlushing = false; // 是否正在执行
const resolePromise = Promise.resolve();

// 如果组件更新，则将更新任务放入队列中
// 同时开启一个一步任务
export function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job); // 任务入队列
  }
  if (!isFlushing) {
    isFlushing = true
  }

  resolePromise.then(() => {
    isFlushing = false;
    // 先拷贝在执行
    const copyQueue = [...queue];
    queue.length = 0;
    copyQueue.forEach(job => job());
    copyQueue.length = 0;
  })
} 
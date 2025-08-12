// 最长递增子序列

function getSequence(arr) {
  const result = [0];
  const len = arr.length;
  for(let i = 0; i< len; i++) {
    const item = arr[i]; // 当前项
    if (item !== 0) {
      // 拿出结果集中最后一项和当前项进行对比
      let resultLastIndex = result[result.length - 1];
      if (arr[resultLastIndex] < item) {
        result.push(i); // 把索引放在结果集中
        continue
      }
    }
  }
}

const ary = [2,6,7,8,9,11];
const res = getSequence(ary);
console.log(res)
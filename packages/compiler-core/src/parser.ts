import { NodeTypes } from "./ast";
import { attrNameReg, attrReg, spaceReg, tagReg } from "./tagReg";

function createParserContext(content: string) {

  return {
    // 原始内容
    originalSource: content,
    // 内容，会随着解析过程不断减少
    source: content,
    line: 1,
    column: 1,
    offset: 0
  }
}

// 解析结束
function isEnd(context) {
  // source 是否为空，或者闭合标签
  return !context.source || context.source.startsWith('</')
}

// 删除内容
function advanceBy(context, endIndex) {
  context.source = context.source.slice(endIndex); // 剩余内容
}

function parseTextData(context, endIndex) {
  // 截取文本内容
  const content = context.source.slice(0, endIndex);
  // 删除文本内容
  advanceBy(context, endIndex);
  return content
}

// 解析文本
function parseText(context) {
  let tokens = ['<', '{{']; // 找到当前最近的词法， 尖括号或者大括号
  let endIndex = context.source.length;
  for (let i = 0; i < tokens.length; i++) {
    const index = context.source.indexOf(tokens[i], 1);
    if (index !== -1 && index < endIndex) {
      endIndex = index;
    }
  }

  // 0 - endIndex 区间就是文本
  const content = parseTextData(context, endIndex);
  return {
    type: NodeTypes.TEXT,
    content
  }
}

function advanceSpaces(context) {
  const match = spaceReg.exec(context.source);
  if (match) {
    advanceBy(context, match[0].length);
  }
}

function parseAttributeValue(context) {
  let quote = context.source[0];

  const isQuoted = quote === '"' || quote === "'";
  let content;
  if (isQuoted) {
    advanceBy(context, 1);
    const endIndex = context.source.indexOf(quote, 1);
    content = parseTextData(context, endIndex);
    advanceBy(context, 1);
  } else {
    content = context.source.match(/([^ \t\r\n])+/)[1];
    advanceBy(context, content.length);
    advanceSpaces(context);
  }
  return content;
}

function parseAttribute(context) {
  // a =   '1'
  let match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source);
  const name = match[0];
  advanceBy(context, name.length);
  let value;
  // =     '  1'
  if (/^[\t\r\n\f ]*=/.test(context.source)) { 
    advanceSpaces(context); // 先删除空格
    advanceBy(context, 1); // 再删除引号
    advanceSpaces(context); // 再删除空格

    value = parseAttributeValue(context);
  }
  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: {
      type: NodeTypes.TEXT,
      content: value
    }
  }
}

function parseAttributes(context) {
  const props = [];
  while(context.source.length > 0 && !context.source.startsWith('>')) {
    props.push(parseAttribute(context));
    advanceSpaces(context);
  }
  return props
}

function parseTag(context) {
  const match = tagReg.exec(context.source);
  const tag = match[1];
  advanceBy(context, match[0].length); // 删除匹配到的内容    
  // 标签后面可能有单个或者多个空格，需要去掉
  advanceSpaces(context); // 删除空格

  const props = parseAttributes(context);

  const isSelfClosing = context.source.startsWith('/>');
  // 如果是自闭和标签，删除自闭合标签的 “/>”，否则删除一个空格
  advanceBy(context, isSelfClosing ? 2 : 1);

  return {
    type: NodeTypes.ELEMENT,
    tag,
    isSelfClosing,
    props
  }
}

// 处理元素
function parseElement(context) {

  const ele = parseTag(context);
  const children = parseChildren(context); // 递归

  if (context.source.startsWith('</')) { // </div>
    parseTag(context);
  }

  (ele as any).children = children;
  return ele
}

// 处理属性
function parseInterpolation(context) {

}

function parseChildren(context: any) {
  const nodes = [] as any;
  while (!isEnd(context)) {
    let node;
    const c = context.source; // 现在解析的内容
    if (c.startsWith('{{')) { // {{ }}
      node = parseInterpolation(context);
    } else if(c[0] === '<') { // <div></div>
      node = parseElement(context);
    } else { // 普通文本  abc   <div>
      node = parseText(context)
    }

    nodes.push(node)
  }
  // 清空节点内容是空的
  for(let i = 0; i < nodes.length; i++) {
    let node = nodes[i]; {
      if (node.type === NodeTypes.TEXT) {
        if (!/[^\t\r\n\f ]/.test(node.content)) { // 内容都是空的
          nodes[i] = null
        } else { // 换行的替换成空字符串
          node.content = node.content.replace(/[\t\r\n\f ]+/g, " ")
        }
      }
    }
  }

  return nodes.filter(Boolean)
}

function createRoot(children) {
  return {
    type: NodeTypes.ROOT,
    children
  }
}

export function parse(template: string) {
  const context = createParserContext(template);
  return createRoot(parseChildren(context))
}
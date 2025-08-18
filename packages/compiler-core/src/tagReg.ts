// /^[ \t\r\n]+/    匹配空格
// /^<\/?([a-z][^ \t\r\n/>]*)/   

// /^[^\t\r\n\f />][^\t\r\n\f />=]*/ 匹配属性名
// /^[\t\r\n\f ]*=/ 匹配空格=
// /[^\t\r\n\f ]/ 空白字符

export const tagReg = /^<\/?([a-z][^ \t\r\n/>]*)/; // 匹配标签
export const attrReg = /^[^\t\r\n\f />][^\t\r\n\f />=]*/; // 匹配属性
export const attrNameReg = /^[^\t\r\n\f />]*=/; // 匹配属性名
export const attrValueReg = /[^\t\r\n\f />=]/; // 匹配属性值
export const spaceReg = /^[ \t\r\n]+/; // 匹配空格
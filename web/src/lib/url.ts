// Only http(s) links are rendered, so a reference cannot smuggle in a javascript: url
export const isWebUrl = (url?: string): url is string => !!url && /^https?:\/\//i.test(url);

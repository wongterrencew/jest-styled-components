const css = require('css')
const { getCSS } = require('../utils')

const getComponentIDs = () => {
  const styles = getCSS()
  const ast = css.parse(styles)
  return ast.stylesheet.rules
    .filter(rule => rule.type === 'comment')
    .reduce((acc, rule) => acc.concat(rule.comment.split(':')[1].trim()), [])
}

const getClassNames = (node, classNames) => {
  if (node.children && node.children.reduce) {
    classNames = node.children.reduce((acc, child) => (
      acc.concat(getClassNames(child, acc))
    ), classNames)
  }

  if (node.props && node.props.className) {
    return classNames.concat(node.props.className.split(' '))
  }

  return classNames
}

const excludeComponentIDs = componentIDs => className => !componentIDs.includes(className)

const filterRules = classNames => (rule) => {
  if (rule.type === 'rule') {
    const className = rule.selectors[0].split(/:| /)[0]
    return classNames.includes(className.substring(1)) && rule.declarations.length
  }

  return false
}

const getMediaQueries = (ast, filter) => (
  ast.stylesheet.rules
    .filter(rule => rule.type === 'media')
    .reduce((acc, mediaQuery) => {
      mediaQuery.rules = mediaQuery.rules.filter(filter)

      if (mediaQuery.rules.length) {
        return acc.concat(mediaQuery)
      }

      return acc
    }, [])
)

const getStyles = (classNames) => {
  const styles = getCSS()
  const ast = css.parse(styles)
  const filter = filterRules(classNames)
  const rules = ast.stylesheet.rules.filter(filter)
  const mediaQueries = getMediaQueries(ast, filter)

  ast.stylesheet.rules = rules.concat(mediaQueries)

  return css.stringify(ast)
}

const replaceClassNames = (classNames, output) => (
  classNames
    .reverse()
    .reduce((acc, selector, index) => acc.replace(new RegExp(selector, 'g'), `c${index}`), output)
)

const removeComponentIDs = (componentIDs, output) => (
  componentIDs.reduce((acc, componentID) => acc.replace(`${componentID} `, ''), output)
)

const styleSheetSerializer = {

  test(val) {
    return val && !val.withStyles && val.$$typeof === Symbol.for('react.test.json')
  },

  print(val, print) {
    val.withStyles = true

    const componentIDs = getComponentIDs()
    const classNames = getClassNames(val, []).filter(excludeComponentIDs(componentIDs))

    const styles = classNames.length ? `${getStyles(classNames)}\n\n` : ''
    const code = print(val)
    let output = `${styles}${code}`

    output = replaceClassNames(classNames, output)
    output = removeComponentIDs(componentIDs, output)

    return output
  },

}

module.exports = styleSheetSerializer

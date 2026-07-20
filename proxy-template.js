export default {
  '/proxy': {
    target: 'http://$ip',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/proxy/, ''),
  },
}

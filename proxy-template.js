export default {
  host: '0.0.0.0',
  port: 3000,
  open: true,
  proxy: {
    '/proxy': {
      target: 'http://$ip',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/proxy/, ''),
    },  
  },
}

<template>
  <div id="app">
    <TickerList />
  </div>
</template>

<script>
import TickerList from './components/TickerList.vue';

export default {
  name: 'App',
  components: {
    TickerList
  }
};
</script>

<style>

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
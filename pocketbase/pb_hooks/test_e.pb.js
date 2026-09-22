routerAdd("GET", "/test-e2", (e) => {
  return e.json(200, { msg: "testing" });
});
onRecordUpdateRequest((e) => {
  let output = "";
  for(let k in e) {
    output += k + ", ";
  }
  $app.logger().info("onRecordUpdate keys: " + output);
  e.next();
}, "projects");

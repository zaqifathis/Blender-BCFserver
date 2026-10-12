import { render } from "preact";
import { App } from "./App";
import { connect } from "./ws";
import "./style.css";

connect();
render(<App />, document.getElementById("app")!);

import { render } from "preact";
import { App } from "./App";
import { connect } from "./api/ws";
import "./styles/tokens.css";
import "./styles/base.css";

connect();
render(<App />, document.getElementById("app")!);

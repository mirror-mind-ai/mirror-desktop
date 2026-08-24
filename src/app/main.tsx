import React from "react";
import ReactDOM from "react-dom/client";
import fixture from "../fixtures/nautilus.mission.yaml?raw";
import { validateMissionFixture } from "../protocol/loadFixture";
import { toViewModel } from "../domain/nautilusViewModel";
import { App } from "./App";
import "../styles/app.css";

const validation = validateMissionFixture(fixture);
const viewModel = toViewModel(validation);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App model={viewModel} />
  </React.StrictMode>,
);

import { Spec } from '@uwdata/mosaic-spec';

export const spec : Spec = {
  "meta": {
    "title": "Contour Plot",
    "description": "Here `heatmap` and `contour` marks visualize the density of data points in a scatter plot of penguin measurments. Setting the `fill` color to `\"species\"` subdivides the data into three sets of densities.\n"
  },
  "data": {
    "penguins": {
      "file": "data/penguins.parquet"
    }
  },
  "params": {
    "bandwidth": 40,
    "thresholds": 10
  },
  "vconcat": [
    {
      "hconcat": [
        {
          "input": "slider",
          "label": "Bandwidth (σ)",
          "as": "$bandwidth",
          "min": 1,
          "max": 100
        },
        {
          "input": "slider",
          "label": "Thresholds",
          "as": "$thresholds",
          "min": 2,
          "max": 20
        }
      ]
    },
    {
      "plot": [
        {
          "mark": "heatmap",
          "data": {
            "from": "penguins"
          },
          "x": "bill_length",
          "y": "bill_depth",
          "fill": "species",
          "bandwidth": "$bandwidth"
        },
        {
          "mark": "contour",
          "data": {
            "from": "penguins"
          },
          "x": "bill_length",
          "y": "bill_depth",
          "stroke": "species",
          "bandwidth": "$bandwidth",
          "thresholds": "$thresholds"
        },
        {
          "mark": "dot",
          "data": {
            "from": "penguins"
          },
          "x": "bill_length",
          "y": "bill_depth",
          "fill": "currentColor",
          "r": 1
        }
      ],
      "xAxis": "bottom",
      "xLabelAnchor": "center",
      "yAxis": "right",
      "yLabelAnchor": "center",
      "margins": {
        "top": 5,
        "bottom": 30,
        "left": 5,
        "right": 50
      },
      "width": 700,
      "height": 480
    }
  ]
};

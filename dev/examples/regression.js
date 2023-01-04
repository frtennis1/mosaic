export default function(el) {
  const { plot, from, dot, regressionY } = vgplot;

  const table = 'athletes';

  el.appendChild(
    plot(
      dot(
        from(table),
        { x: 'weight', y: 'height', fill: 'sex', r: 2, opacity: 0.5 }
      ),
      regressionY(
        from(table),
        { x: 'weight', y: 'height', stroke: 'sex' }
      )
    )
  );
}
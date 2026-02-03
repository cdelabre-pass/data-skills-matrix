<script lang="ts">
	import { onMount } from 'svelte';
	import { Chart, RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip } from 'chart.js';

	export let data: Record<string, number>;

	let canvas: HTMLCanvasElement;
	let chart: Chart | null = null;

	Chart.register(RadarController, RadialLinearScale, PointElement, LineElement, Filler, Tooltip);

	const categoryNames: Record<string, string> = {
		analytics: 'Analytics',
		engineering: 'Engineering',
		ml: 'Machine Learning',
		ops: 'Data Ops',
		compliance: 'Compliance',
		business: 'Business'
	};

	onMount(() => {
		const labels = Object.keys(data).map(k => categoryNames[k] || k);
		const values = Object.values(data);

		chart = new Chart(canvas, {
			type: 'radar',
			data: {
				labels,
				datasets: [{
					label: 'Niveau moyen',
					data: values,
					backgroundColor: 'rgba(57, 67, 180, 0.2)',
					borderColor: 'rgba(57, 67, 180, 1)',
					borderWidth: 2,
					pointBackgroundColor: 'rgba(57, 67, 180, 1)',
					pointBorderColor: '#fff',
					pointHoverBackgroundColor: '#fff',
					pointHoverBorderColor: 'rgba(57, 67, 180, 1)'
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					r: {
						beginAtZero: true,
						max: 4,
						ticks: {
							stepSize: 1,
							font: {
								size: 10
							}
						},
						pointLabels: {
							font: {
								size: 12
							}
						}
					}
				},
				plugins: {
					tooltip: {
						callbacks: {
							label: (context) => `Niveau: ${(context.raw as number)?.toFixed(1)}`
						}
					}
				}
			}
		});

		return () => {
			chart?.destroy();
		};
	});

	$: if (chart && data) {
		const labels = Object.keys(data).map(k => categoryNames[k] || k);
		const values = Object.values(data);
		chart.data.labels = labels;
		chart.data.datasets[0].data = values;
		chart.update();
	}
</script>

<canvas bind:this={canvas}></canvas>

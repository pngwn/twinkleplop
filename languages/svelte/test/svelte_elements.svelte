<svelte:component this={Component} />
<svelte:element this={tagname}>hi</svelte:element>
<svelte:window on:resize={handler} />
<svelte:document on:keydown={handler} />
<svelte:body on:mousemove={handler} />
<svelte:head>
	<title>Page</title>
</svelte:head>
<svelte:self />
<svelte:fragment slot="named">content</svelte:fragment>
<svelte:boundary>hi</svelte:boundary>
<svelte:options customElement="my-el" />

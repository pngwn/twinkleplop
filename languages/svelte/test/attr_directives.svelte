<input bind:value={name} bind:this={el} />
<button on:click={handler}>go</button>
<button on:click|preventDefault|stopPropagation={handler}>stop</button>
<div use:action={params}>hi</div>
<div transition:fade={{duration: 200}}>hi</div>
<div transition:fade|local>hi</div>
<div in:fly out:fly animate:flip>hi</div>
<li class:active={isActive} class:done>item</li>
<span style:color={c} style:font-weight|important={w}>hi</span>
<div let:item let:index={i}>hi</div>

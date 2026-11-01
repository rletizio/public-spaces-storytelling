// The twelve scenes of the story. Text follows prompt/Storytelling Structure.md.
// `tall` gives a scene extra scrolling room (its text card stays put) for highlights that appear mid-scene.
// `visual` describes what the sticky stage shows; the real visualizations replace the placeholders scene by scene.
export const steps = [
	{
		id: 'news',
		role: 'Hook',
		title: 'Recently, Copley Square made the news.',
		body: 'The newly renovated place, part of the shared image of Boston, got mixed judgments. But iconic and everyday places enter this kind of debate alike.',
		visual: 'Four smartphone screenshots of news and online posts about Harvard Square, City Hall Plaza, Copley Square and Central Square.'
	},
	{
		id: 'journey',
		role: 'Hook',
		title: 'A journey through the Boston-area public spaces',
		body: 'Why care about these spaces when Boston is known for its big parks? We look at how the cities relate to their parks, plazas and squares.',
		visual: 'Title and call-out on a clean screen.'
	},
	{
		id: 'everyone',
		role: 'Rising',
		title: 'Almost everyone lives within a short walk of a public space.',
		body: 'There are 836 parks, plazas, playgrounds and gardens across Boston, Cambridge and Somerville. 98% of residents live within 500 m of one, about a six-minute walk.',
		visual: 'Dashboard 1 map, zoomed out to every public space. No controls.'
	},
	{
		id: 'closest',
		role: 'Rising',
		title: 'What is closest to you?',
		body: 'This map contains all the public spaces in the area. Which ones do you pass every day? And which is the closest to your home?',
		visual: 'Dashboard 1 map with interaction: drag, zoom, hover.'
	},
	{
		id: 'small',
		role: 'Rising',
		title: 'Chances are, it is small.',
		body: 'For two in three residents, the nearest public space is under 5 acres. For nearly half, it is under one. For one in five, the nearest is a park of 10 acres or more.',
		visual: 'Map fades; a stacked bar of residents by nearest-space size fills from left to right.'
	},
	{
		id: 'order',
		tall: true,
		role: 'Rising',
		title: 'Let us order all the spaces by size.',
		body: 'The ten largest spaces hold 43% of all the public space area.',
		visual: 'Dashboard 2 dot plot, x-axis by size.'
	},
	{
		id: 'access',
		tall: true,
		role: 'Rising',
		title: 'But size is not access.',
		body: 'Half of all spaces are under half an acre, and how many people live near a space has almost nothing to do with how big it is. Christian Science Plaza is accessible to more than 25 thousand people, almost as many as Franklin Park, which is 57 times larger.',
		visual: 'The same dots move to an access axis. Christian Science Plaza and Franklin Park highlighted.'
	},
	{
		id: 'history',
		tall: true,
		role: 'Rising',
		title: 'Why it looks like this, in Boston',
		body: 'About two thirds of the public space we can date in Boston was created between 1875 and 1900. In 1875 the city passed a Park Act, and in 1878 it hired Frederick Law Olmsted to design a chain of large parks, the Emerald Necklace. They were meant as an escape from city life and for public health, for the whole city. This is Boston history; Cambridge and Somerville have their own.',
		visual: 'Dashboard 2 ownership timeline, Boston only, Emerald Necklace spaces highlighted.'
	},
	{
		id: 'people',
		tall: true,
		role: 'Message',
		title: 'Public space does not follow people.',
		body: 'Small spaces cluster near downtown Boston. The largest areas of public space lie south and southwest of downtown. Then the residents join the map.',
		visual: 'Dashboard 3 grid map: circles for public space, then color for residents per acre.'
	},
	{
		id: 'priority',
		tall: true,
		role: 'Message',
		title: 'In these places, the small plazas and squares make the difference.',
		body: 'Here each acre of public space is shared by more than 1,000 people, and no large park lies within 1,000 m.',
		visual: 'Dashboard 3 grid map with priority cells outlined.'
	},
	{
		id: 'whyte',
		role: 'Close',
		title: 'I end then in praise of small spaces.',
		body: 'For a city, such places are priceless, whatever the cost. They are built of a set of basics and they are right in front of our noses. If we will look. William H. Whyte, The Social Life of Small Urban Spaces (1980).',
		visual: 'The quote over the faded map.'
	},
	{
		id: 'close',
		role: 'Close',
		title: 'Know. Care. Expand.',
		body: 'Know the small places near you: they are mapped, they are used, and they are in reach. Care about how they are designed and kept, because people already do. Expand where many people share few.',
		visual: 'Three columns, then an Explore again button back to the map.'
	}
];

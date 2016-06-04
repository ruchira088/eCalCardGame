const React = require("react")
const ReactDOM = require("react-dom")
const classNames = require("classnames")
const $ = require("jquery")
require("../bower_components/typeahead.js/dist/typeahead.bundle.js")

const messageFormID = "messageFormLink"
const inboxID = "inboxLink"

window.jQuery = $

const MessagesPage = React.createClass(
{
	mappings: (function()
	{
		const mappings = new Map()

		mappings.set(messageFormID, () => {
			return {
				id: messageFormID,
				component: <MessageForm/>
			}		
		})

		mappings.set(inboxID, () => {
			return {
				id:inboxID,
				component: <Inbox/>
			}
		})

		return mappings
	})()
	,
	getInitialState: function()
	{
		return {
			id:inboxID,
			component: <Inbox/>
		}
	}
	,
	changeContent: function(id)
	{
		this.setState(this.mappings.get(id)());
	}
	,
	render: function()
	{
		return (
			<div>
				<div className="col-sm-3">
					<Navigator active={this.state.id} callback={this.changeContent}/>
				</div>
				<div className="col-sm-9">
					{this.state.component}
				</div>
			</div>
		)
	}
});

const MessageForm = React.createClass(
{
	getInitialState: function()
	{
		return {
			receiver: "",
			subject: "",
			message: ""
		}
	}
	,
	componentDidMount: function()
	{
		$("#receiver").typeahead(
		{
		},
		{
			display: function(value)
			{
				return value.email
			}
			,
			source: function(query, syncResults)
			{
				const lowerCaseQuery = query.toLowerCase()

				const results = sampleDataSet
					.filter(value => value.name.toLowerCase().includes(lowerCaseQuery))

				syncResults(results)
			},
			templates: {
				suggestion: function({name})
				{
					return `<div>Hello ${name}</div>`
				}
			}
		})
	}
	,
	handleSend: function()
	{
		$.ajax(
		{
			method: "POST",
			url: "/messages/post",
			contentType: "application/json; charset=UTF-8",
			data: JSON.stringify({
				receiver: this.state.receiver,
				subject: this.state.subject,
				messageBody: this.state.message
			})

		})
		.done(response => 
		{
			this.setState(this.getInitialState())
		})
		.fail((ajax, status, err) => 
		{
			console.log(err)
		})
	}
	,
	handleTextChange: function({target})
	{
		const state = {}
		state[target.id] = target.value

		this.setState(state)
	}
	,
	render: function()
	{
		return (
			<div id="messageForm">
				<div className="form-group">
					<label for="receiver">To</label>
					<input id="receiver" type="text" onChange={this.handleTextChange} 
					value={this.state.receiver} className="form-control"/>
				</div>
				<div className="form-group">
					<label for="subject">Subject</label>
					<input id="subject" type="text" onChange={this.handleTextChange} 
					value={this.state.subject} className="form-control"/>
				</div>
				<div className="form-group">
					<label for="message">Message</label>
					<textarea id="message" rows="8" onChange={this.handleTextChange} 
					value={this.state.message} className="form-control"></textarea>
				</div>
				<div>
					<button onClick={this.handleSend} className="btn btn-success">Send</button>
				</div>
			</div>
		);
	}
});

const Navigator = React.createClass(
{
	navigatorValues: [
	{
		id: messageFormID,
		title: "Create Message"
	},
	{
		id: inboxID,
		title: "Inbox"
	}]
	,
	handleClick: function({target})
	{
		this.props.callback(target.id);
	}
	,
	render: function()
	{
		const tabs = this.navigatorValues.map(value => 
		{
			const classes = classNames(
			
				"btn", "btn-default", { active: value.id === this.props.active}
			)

			return (
				<li className={classes} 
				 id={value.id} key={value.id} onClick={this.handleClick}>{value.title}</li>
			)
		})

		return (
			<ul id="navigator" className="nav nav-pills nav-stacked">
				{tabs}	
			</ul>
		)
	}	
});

const Inbox = React.createClass(
{
	getInitialState: function()
	{
		return {
			messages: []
		}
	}
	,
	componentDidMount: function()
	{
		$.ajax(
		{
			url: "/messages/get"
		})
		.done(data => 
		{
			this.setState({messages: data.messages})
		})
	}
	,
	render: function()
	{
		const messages = this.state.messages.map((message, index) => 
		{
			return (
				<MessageSummary sender={message.sender} subject={message.subject} key={index}/>
			)
		})

		return (
			<table className="table">
				<tbody>
					{messages}
				</tbody>
			</table>
		)
	}
})

const MessageSummary = React.createClass(
	{
		render: function()
		{
			return (
				<tr className="messageSummary">
					<td className="sender">
						{this.props.sender}
					</td>
					<td className="subject">
						{this.props.subject}
					</td>
				</tr>
			)
		}
	});


$(document).ready(function()
	{
		ReactDOM.render(<MessagesPage/>, document.getElementById("attachmentPoint"))
	});

const sampleDataSet = [
  {
    "_id": "5752ee7710fd0a2b544a2dc4",
    "index": 0,
    "guid": "c511023a-f271-418f-bd43-522ef5defbe3",
    "name": "Short Vargas",
    "gender": "male",
    "company": "OHMNET",
    "email": "shortvargas@ohmnet.com",
    "phone": "+1 (943) 520-3294"
  },
  {
    "_id": "5752ee77a933055c35eae4fe",
    "index": 1,
    "guid": "bbc3e0cf-d930-4387-a3bf-d323d4a76664",
    "name": "Chrystal Salas",
    "gender": "female",
    "company": "SIGNIDYNE",
    "email": "chrystalsalas@signidyne.com",
    "phone": "+1 (865) 481-2065"
  },
  {
    "_id": "5752ee77c2e2dcfd9a3942d4",
    "index": 2,
    "guid": "41ab785e-13cc-45a7-8fca-012890ec18d6",
    "name": "Eugenia Burgess",
    "gender": "female",
    "company": "GYNK",
    "email": "eugeniaburgess@gynk.com",
    "phone": "+1 (827) 531-2568"
  },
  {
    "_id": "5752ee77b18f8732d0a21f89",
    "index": 3,
    "guid": "d1f0d080-5fab-4c9e-b6f7-1164295c4c29",
    "name": "Gay Norman",
    "gender": "male",
    "company": "SIGNITY",
    "email": "gaynorman@signity.com",
    "phone": "+1 (833) 508-2438"
  },
  {
    "_id": "5752ee77dc127bc7d23a4eb8",
    "index": 4,
    "guid": "a82193b9-7c89-4d57-ba53-4c53164ba143",
    "name": "Avery Merritt",
    "gender": "male",
    "company": "KYAGORO",
    "email": "averymerritt@kyagoro.com",
    "phone": "+1 (918) 423-2443"
  },
  {
    "_id": "5752ee77f3397eeca6421ab6",
    "index": 5,
    "guid": "c6ea467b-ee1d-4caa-9ffd-dfc9d50e0066",
    "name": "Perry Paul",
    "gender": "male",
    "company": "KENGEN",
    "email": "perrypaul@kengen.com",
    "phone": "+1 (839) 464-3172"
  },
  {
    "_id": "5752ee77ab5c39369985c814",
    "index": 6,
    "guid": "1217f9bf-754b-483c-9ff3-fe3b227de8d8",
    "name": "Hooper Orr",
    "gender": "male",
    "company": "VENOFLEX",
    "email": "hooperorr@venoflex.com",
    "phone": "+1 (840) 434-3786"
  },
  {
    "_id": "5752ee77f52a099440284f85",
    "index": 7,
    "guid": "4829f75b-c1fd-4ef7-8214-2a3fd64fa7e8",
    "name": "Drake Perry",
    "gender": "male",
    "company": "POSHOME",
    "email": "drakeperry@poshome.com",
    "phone": "+1 (991) 548-3703"
  },
  {
    "_id": "5752ee7718ca4be2ffcaf60e",
    "index": 8,
    "guid": "bf2dc787-f3e1-4c90-9d14-82a1f4f5bc12",
    "name": "Morrow Greene",
    "gender": "male",
    "company": "EXTRAGENE",
    "email": "morrowgreene@extragene.com",
    "phone": "+1 (808) 515-2812"
  },
  {
    "_id": "5752ee776f77b947d67be919",
    "index": 9,
    "guid": "4d30a79a-0318-43e1-8655-c94045bd43f9",
    "name": "Elisabeth Collins",
    "gender": "female",
    "company": "SUREMAX",
    "email": "elisabethcollins@suremax.com",
    "phone": "+1 (969) 450-2217"
  },
  {
    "_id": "5752ee7749fbd4992b220cc9",
    "index": 10,
    "guid": "eb476d9c-9c04-4ee0-8a05-03f906e87bbc",
    "name": "Ofelia Kerr",
    "gender": "female",
    "company": "ESCHOIR",
    "email": "ofeliakerr@eschoir.com",
    "phone": "+1 (949) 426-3798"
  },
  {
    "_id": "5752ee7700bcb82b58e2802b",
    "index": 11,
    "guid": "209e084e-d93a-4239-9832-583ecbf900f2",
    "name": "Dixie Nguyen",
    "gender": "female",
    "company": "BRISTO",
    "email": "dixienguyen@bristo.com",
    "phone": "+1 (804) 467-3569"
  },
  {
    "_id": "5752ee77fe516b32f23ad21c",
    "index": 12,
    "guid": "e6ad25ba-8beb-4809-bf49-38c345c00a8e",
    "name": "Alston Hunter",
    "gender": "male",
    "company": "SHADEASE",
    "email": "alstonhunter@shadease.com",
    "phone": "+1 (927) 415-2623"
  },
  {
    "_id": "5752ee77bc7a08ff331b2400",
    "index": 13,
    "guid": "58702136-926a-44ef-b2f0-db091a6244f2",
    "name": "Bishop Beard",
    "gender": "male",
    "company": "NORSUP",
    "email": "bishopbeard@norsup.com",
    "phone": "+1 (933) 552-2690"
  },
  {
    "_id": "5752ee772fc5ee267dc2f8b1",
    "index": 14,
    "guid": "0c66c4e7-3f52-4c56-9348-d94df0c4a93e",
    "name": "Mckay Mullen",
    "gender": "male",
    "company": "UNIWORLD",
    "email": "mckaymullen@uniworld.com",
    "phone": "+1 (804) 586-3038"
  },
  {
    "_id": "5752ee777f55146c0b5a0657",
    "index": 15,
    "guid": "fe722c11-0e01-4f9f-9621-692ae074318e",
    "name": "Gracie Kaufman",
    "gender": "female",
    "company": "OBONES",
    "email": "graciekaufman@obones.com",
    "phone": "+1 (871) 447-2308"
  },
  {
    "_id": "5752ee775ee2895e7ec61ab3",
    "index": 16,
    "guid": "d71136cc-d208-4595-b907-4a1647ba90c8",
    "name": "Catherine Albert",
    "gender": "female",
    "company": "PEARLESEX",
    "email": "catherinealbert@pearlesex.com",
    "phone": "+1 (937) 600-2997"
  },
  {
    "_id": "5752ee7708f54dbb51b1d583",
    "index": 17,
    "guid": "6a71f99d-ad80-4a5c-93e2-87898cac6c4f",
    "name": "Melendez Steele",
    "gender": "male",
    "company": "EXPOSA",
    "email": "melendezsteele@exposa.com",
    "phone": "+1 (930) 502-3501"
  },
  {
    "_id": "5752ee77253c69f5233c9852",
    "index": 18,
    "guid": "cf74efd4-dc1a-4322-b87f-164a6a864aa5",
    "name": "Orr Dunn",
    "gender": "male",
    "company": "SUNCLIPSE",
    "email": "orrdunn@sunclipse.com",
    "phone": "+1 (990) 459-2964"
  },
  {
    "_id": "5752ee7750e5df3c3f8afcdc",
    "index": 19,
    "guid": "5c8f376c-3ef9-4b6f-ade1-9ac4d986062b",
    "name": "Good Page",
    "gender": "male",
    "company": "COMTOUR",
    "email": "goodpage@comtour.com",
    "phone": "+1 (854) 465-3731"
  },
  {
    "_id": "5752ee77c091679f4676a098",
    "index": 20,
    "guid": "eb885edb-c242-4f51-be1e-279ff31e1096",
    "name": "Bradford Reese",
    "gender": "male",
    "company": "ETERNIS",
    "email": "bradfordreese@eternis.com",
    "phone": "+1 (999) 537-3326"
  },
  {
    "_id": "5752ee778303db0dee49080f",
    "index": 21,
    "guid": "730cbb72-f502-4c73-98db-3c7ab1ae00a8",
    "name": "Tonia Benton",
    "gender": "female",
    "company": "VALPREAL",
    "email": "toniabenton@valpreal.com",
    "phone": "+1 (885) 432-3093"
  },
  {
    "_id": "5752ee779a513bf42d3f8cad",
    "index": 22,
    "guid": "b763a5fc-38e4-40fe-9640-7c8050b0d536",
    "name": "Craft Carver",
    "gender": "male",
    "company": "RAMJOB",
    "email": "craftcarver@ramjob.com",
    "phone": "+1 (872) 552-3415"
  },
  {
    "_id": "5752ee7776622572003b9f87",
    "index": 23,
    "guid": "834f8282-5cc9-4c3c-9f05-6edb42ba1e24",
    "name": "Wong Houston",
    "gender": "male",
    "company": "DEMINIMUM",
    "email": "wonghouston@deminimum.com",
    "phone": "+1 (886) 495-2225"
  },
  {
    "_id": "5752ee77cf2b7a54660dc708",
    "index": 24,
    "guid": "310848eb-b3ff-41d0-8f79-59daacf33c06",
    "name": "Bradshaw Abbott",
    "gender": "male",
    "company": "INFOTRIPS",
    "email": "bradshawabbott@infotrips.com",
    "phone": "+1 (940) 507-3223"
  },
  {
    "_id": "5752ee778aa489495f107c79",
    "index": 25,
    "guid": "59cac9b8-aae6-453e-9994-7b7a1838412a",
    "name": "Cochran Bean",
    "gender": "male",
    "company": "EWAVES",
    "email": "cochranbean@ewaves.com",
    "phone": "+1 (935) 487-3133"
  },
  {
    "_id": "5752ee77678cc600f5d82490",
    "index": 26,
    "guid": "b561fade-373c-4639-ae70-9614d990d378",
    "name": "Holder Allison",
    "gender": "male",
    "company": "APPLIDECK",
    "email": "holderallison@applideck.com",
    "phone": "+1 (894) 591-3533"
  },
  {
    "_id": "5752ee7721676829ccb9d0b7",
    "index": 27,
    "guid": "5fb1c26d-3e68-4d41-bbe0-8132fbced211",
    "name": "Meagan Luna",
    "gender": "female",
    "company": "COMVEY",
    "email": "meaganluna@comvey.com",
    "phone": "+1 (981) 517-3527"
  },
  {
    "_id": "5752ee778ab0c749550cfc85",
    "index": 28,
    "guid": "878df04f-f9f6-4a09-b275-061f97b54f61",
    "name": "Church Russo",
    "gender": "male",
    "company": "KIDSTOCK",
    "email": "churchrusso@kidstock.com",
    "phone": "+1 (843) 442-3304"
  },
  {
    "_id": "5752ee77da9834192cfc8d63",
    "index": 29,
    "guid": "b0979b69-004f-40f6-a665-041d6b2c8452",
    "name": "Kendra Maldonado",
    "gender": "female",
    "company": "ONTAGENE",
    "email": "kendramaldonado@ontagene.com",
    "phone": "+1 (882) 537-2373"
  },
  {
    "_id": "5752ee77dab36f15a1aee413",
    "index": 30,
    "guid": "46fd46ff-0596-4fb4-b144-21c17a7a0a0b",
    "name": "Mayra Ward",
    "gender": "female",
    "company": "ECOSYS",
    "email": "mayraward@ecosys.com",
    "phone": "+1 (906) 481-2758"
  },
  {
    "_id": "5752ee77f767898b96555765",
    "index": 31,
    "guid": "cbd74de3-f0d7-41a4-8ad6-bf41e8f3fadf",
    "name": "Gonzalez Fletcher",
    "gender": "male",
    "company": "ENVIRE",
    "email": "gonzalezfletcher@envire.com",
    "phone": "+1 (806) 471-2941"
  },
  {
    "_id": "5752ee77adb28013ac4f055e",
    "index": 32,
    "guid": "5f4f137a-0876-4428-94e4-9b0e901670a0",
    "name": "Kent Zimmerman",
    "gender": "male",
    "company": "COMSTRUCT",
    "email": "kentzimmerman@comstruct.com",
    "phone": "+1 (812) 416-3674"
  },
  {
    "_id": "5752ee7715f7d4e4b404481d",
    "index": 33,
    "guid": "9e9811b8-33b7-4399-a1df-9c1adf3f4bdd",
    "name": "Leanna Pennington",
    "gender": "female",
    "company": "QUAREX",
    "email": "leannapennington@quarex.com",
    "phone": "+1 (970) 584-3018"
  },
  {
    "_id": "5752ee779279db52cf5dc229",
    "index": 34,
    "guid": "b5d65c00-b15d-479f-9a7e-b798aaee2510",
    "name": "Hinton Logan",
    "gender": "male",
    "company": "EARBANG",
    "email": "hintonlogan@earbang.com",
    "phone": "+1 (897) 496-2309"
  },
  {
    "_id": "5752ee7776829ae30754ebb7",
    "index": 35,
    "guid": "cf48dab4-d1cd-488f-acf7-8b92813c713c",
    "name": "Beryl Vazquez",
    "gender": "female",
    "company": "QUARMONY",
    "email": "berylvazquez@quarmony.com",
    "phone": "+1 (898) 567-3748"
  },
  {
    "_id": "5752ee77490b3280fcd602b4",
    "index": 36,
    "guid": "12ea0960-22f0-4a90-83da-6ac83d2dc84d",
    "name": "Violet Reed",
    "gender": "female",
    "company": "PODUNK",
    "email": "violetreed@podunk.com",
    "phone": "+1 (894) 416-2251"
  },
  {
    "_id": "5752ee77b0133b0f46374ab3",
    "index": 37,
    "guid": "65fe7404-f81c-4b53-988d-0dbf8207aaab",
    "name": "Madden Ratliff",
    "gender": "male",
    "company": "PROTODYNE",
    "email": "maddenratliff@protodyne.com",
    "phone": "+1 (956) 586-2885"
  },
  {
    "_id": "5752ee774b20acbd25f0bdf8",
    "index": 38,
    "guid": "3c55cc25-755b-4c5e-af66-b51e0b9eca23",
    "name": "Mckenzie Durham",
    "gender": "male",
    "company": "LOCAZONE",
    "email": "mckenziedurham@locazone.com",
    "phone": "+1 (893) 569-2270"
  },
  {
    "_id": "5752ee773326395babc44f46",
    "index": 39,
    "guid": "f5f9af18-82fe-4622-a063-47fb8cfff841",
    "name": "Corina Garner",
    "gender": "female",
    "company": "ZENTHALL",
    "email": "corinagarner@zenthall.com",
    "phone": "+1 (979) 526-3946"
  },
  {
    "_id": "5752ee77975b6bc86f101aa7",
    "index": 40,
    "guid": "ff839cee-5d68-49ed-9b4e-aaab87b893fc",
    "name": "Sheila Lott",
    "gender": "female",
    "company": "EZENTIA",
    "email": "sheilalott@ezentia.com",
    "phone": "+1 (870) 402-3103"
  },
  {
    "_id": "5752ee77733efdd4b2ebf459",
    "index": 41,
    "guid": "9a0a4ac0-8cb9-4e44-8da6-a8a408d487f4",
    "name": "Wilma Elliott",
    "gender": "female",
    "company": "BIOSPAN",
    "email": "wilmaelliott@biospan.com",
    "phone": "+1 (818) 502-3994"
  },
  {
    "_id": "5752ee7700ca87061bd6d3fd",
    "index": 42,
    "guid": "6f6bef44-08f6-4bd7-b0fa-198dbe22f060",
    "name": "Phoebe Osborn",
    "gender": "female",
    "company": "NAMEBOX",
    "email": "phoebeosborn@namebox.com",
    "phone": "+1 (890) 560-3812"
  },
  {
    "_id": "5752ee77db2a8b182618d152",
    "index": 43,
    "guid": "184a63e8-120f-41d7-bf19-d71332f9cd3b",
    "name": "Mae Gillespie",
    "gender": "female",
    "company": "ZOXY",
    "email": "maegillespie@zoxy.com",
    "phone": "+1 (823) 524-3086"
  },
  {
    "_id": "5752ee779986fb6114683f83",
    "index": 44,
    "guid": "65302714-5daf-41ef-8ed9-6e47036d24e7",
    "name": "York Sherman",
    "gender": "male",
    "company": "GORGANIC",
    "email": "yorksherman@gorganic.com",
    "phone": "+1 (956) 415-2936"
  },
  {
    "_id": "5752ee774d98f4081bc293f0",
    "index": 45,
    "guid": "9dd04f93-be3c-4538-afac-de88dbd60742",
    "name": "Goodwin Clemons",
    "gender": "male",
    "company": "GEOFORMA",
    "email": "goodwinclemons@geoforma.com",
    "phone": "+1 (990) 476-3117"
  },
  {
    "_id": "5752ee77ba6ba88b027a5da4",
    "index": 46,
    "guid": "770e0153-4a22-4285-99fd-afb16416ad47",
    "name": "Harrell Mcclain",
    "gender": "male",
    "company": "EXOSTREAM",
    "email": "harrellmcclain@exostream.com",
    "phone": "+1 (905) 463-3275"
  },
  {
    "_id": "5752ee77e26ed7e9d79ed045",
    "index": 47,
    "guid": "2056084f-2a17-410e-b8a4-ebb42295115e",
    "name": "Bruce Pearson",
    "gender": "male",
    "company": "PORTALIS",
    "email": "brucepearson@portalis.com",
    "phone": "+1 (805) 576-2891"
  },
  {
    "_id": "5752ee771772fefc8f1e6e42",
    "index": 48,
    "guid": "b0eff231-354d-4b9c-8f62-9f0a817a433c",
    "name": "Wyatt Baxter",
    "gender": "male",
    "company": "BOINK",
    "email": "wyattbaxter@boink.com",
    "phone": "+1 (918) 502-2116"
  },
  {
    "_id": "5752ee7758907f5256f4fe00",
    "index": 49,
    "guid": "93ba0c5f-a36f-46be-88c4-32c8b0b8e842",
    "name": "Marcia Montgomery",
    "gender": "female",
    "company": "MICRONAUT",
    "email": "marciamontgomery@micronaut.com",
    "phone": "+1 (943) 538-2984"
  }
]


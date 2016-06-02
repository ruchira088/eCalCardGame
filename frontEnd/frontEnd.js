const React = require("react")
const ReactDOM = require("react-dom")
const $ = require("jquery")

const messageFormID = "messageFormLink"
const inboxID = "inboxLink"

const MessagesPage = React.createClass(
{
	mappings: (function()
	{
		const mappings = new Map()

		mappings.set(messageFormID, () => <MessageForm/>)
		mappings.set(inboxID, () => <Inbox/>)

		return mappings
	})()
	,
	getInitialState: function()
	{
		return <Inbox/>
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
					<Navigator callback={this.changeContent}/>
				</div>
				<div className="col-sm-9">
					{this.state}
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
	handleClick: function({target})
	{
		this.props.callback(target.id);
	}
	,
	render: function()
	{
		return (
			<ul id="navigator">
				<li id={messageFormID} onClick={this.handleClick}>Create Message</li>
				<li id={inboxID} onClick={this.handleClick}>Inbox</li>
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
			<div>
				{messages}
			</div>
		)
	}
})

const MessageSummary = React.createClass(
	{
		render: function()
		{
			return (
				<div>
					<div className="sender">
						{this.props.sender}
					</div>
					<div>
						{this.props.subject}
					</div>
				</div>
			)
		}
	});


$(document).ready(function()
	{
		ReactDOM.render(<MessagesPage/>, document.getElementById("attachmentPoint"))
	});
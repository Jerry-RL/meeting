import React, { Component, Fragment } from 'react'
import io from 'socket.io-client'
import faker from "faker"
// ICONS
import {IconButton, Badge} from '@material-ui/core'
import VideocamIcon from '@material-ui/icons/Videocam'
import VideocamOffIcon from '@material-ui/icons/VideocamOff'
import MicIcon from '@material-ui/icons/Mic'
import MicOffIcon from '@material-ui/icons/MicOff'
import ScreenShareIcon from '@material-ui/icons/ScreenShare'
import StopScreenShareIcon from '@material-ui/icons/StopScreenShare'
import CallEndIcon from '@material-ui/icons/CallEnd'
import ChatIcon from '@material-ui/icons/Chat'
import icon1 from './icon/icon1.jpg'
import icon2 from './icon/icon7.png'
import icon3 from './icon/icon3.png'
import icon4 from './icon/icon4.png'
import icon5 from './icon/icon5.png'
import icon6 from './icon/icon6.jpg'
import poster2 from  './icon/poster2.png'
import videoCanvas from 'video-canvas'
import {ShakeOutlined } from '@ant-design/icons';
import Error from '../Error'
import {changeCssVideos, checkMessage,getBase64,scrollToBottom,toggleVideoSize} from '../lib/utils'
import {MessageBox,MessageBoxLeft,UserContainer,Sender,
			  SenderLeft,
	      VideoBox,IconList,MessageContainer,GlobalStyle,ImageBox,ImageBoxLeft,IconImages,DrawerItem} from './style';
import chatWallPaper from './icon/chatWallPaper2.png'
// import chatWallPaper from './icon/chatWallPaper.jpg'
import { message, Modal as AntModal, Radio ,Button as ButtonAnt, Drawer,Image,Input,Upload } from 'antd'
import 'antd/dist/antd.css'
import {getIconList,leaveRoom} from '../Api/request'
import { UploadOutlined ,CameraOutlined,UserOutlined } from '@ant-design/icons';
import {withRouter } from 'react-router';
import { Row } from 'reactstrap'
import Modal from 'react-bootstrap/Modal'
import 'bootstrap/dist/css/bootstrap.css'
import "./index.css"

const server_url = "http://localhost:8080" 
var connections = {}
// connections[socketListId] = new RTCPeerConnection(peerConnectionConfig)
const peerConnectionConfig = {
	'iceServers': [
		{ 'urls': 'stun:stun.services.mozilla.com' },
		{ 'urls': 'stun:stun.l.google.com:19302' },
	]
}
var socket = null
var socketId = null
var elms = 0
class Video extends Component {
	constructor(props) {
		super(props)
		this.localVideoRef = React.createRef()
		this.shareScreen = React.createRef()


		this.videoAvailable = false
		this.audioAvailable = false

		this.state = {
			myBrowser: true,
			defaultImg:1,
			iconList:[],
			userImg:'',
			selectedImg:'',
			screenVisible:false,
			screenData:[],
			flipList:[],
			fileList:[],
			roomId:'',
			password:'',
			flipVideo:'',
			video: false,
			audio: false,
			screen: false,
			showModal: false,
			screenAvailable: false,
			messages: [],
			message: "",
			newMessages: 0,
			askForUsername: true,
			username: faker.internet.userName(),
			drawerVisible:false,
			userList:[],
		}
		connections = {}
		this.loadIconList();
		this.checkPermission(props);
	}

	componentDidMount=()=>{
		this.myBrowser()
	}

		loadIconList(){
			let info ={roomId:this.props.location.state.roomId}
			let list=null;
		  getIconList(info).then((res)=>{
				console.log(res)
				if(res.result['usedIcon']!==undefined){
					list= Object.values(res.result['usedIcon']);// [[icon,user],[icon2,user2] ]
					let tempUserList=[]
					let tempUserIcon=[]
					for(let [icon,user] of list){
						tempUserIcon.push(icon);
						tempUserList.push(user)
					}
					this.setState({iconList:tempUserIcon,userList:tempUserList},()=>{
						console.log(this.state.iconList)
						console.log(11111111111111)
						console.log(this.state.userList)
						this.checkIconList()
					})
				}
				// ??????icon???????????????
			}).catch((err)=>{
				console.log(err)
			})
		}
		updateIconList(){
			let info ={roomId:this.props.location.state.roomId}
			let list=null;
		  getIconList(info).then((res)=>{
				console.log(res)
				if(res.result['usedIcon']!==undefined){
					list= Object.values(res.result['usedIcon']);// [[icon,user],[icon2,user2] ]
					let tempUserList=[]
					let tempUserIcon=[]
					for(let [icon,user] of list){
						tempUserIcon.push(icon);
						tempUserList.push(user)
					}
					this.setState({iconList:tempUserIcon,userList:tempUserList},()=>{
						console.log(this.state.iconList)
						console.log(this.state.userList)
					})
				}
				// ??????icon???????????????
			}).catch((err)=>{
				console.log(err)
			})
		}
	checkPermission(props){
		if(! props.location.state){
			//  ! props.location.state.password 
			message.error(`Please log in`,0.5)
			this.props.history.push({pathname:'/'})
		}
		else{
			this.getPermissions(props)

			return true;
			}
	}

	getPermissions = async (props) => {
		try{
			await navigator.mediaDevices.getUserMedia({ video: true })
				.then(() => this.videoAvailable = true)
				.catch(() => this.videoAvailable = false)
			await navigator.mediaDevices.getUserMedia({ audio: true })
			// await navigator.mediaDevices.getUserMedia({ audio: {
				// echoCancellation:true,
				// autoGainControl:false,
				// googAutoGainControl:false,
				// noiseSuppression:false

			// } })
				.then(() => this.audioAvailable = true)
				.catch(() => this.audioAvailable = false)

				// getDisplayMedia() ??????????????????????????????????????????????????????????????????????????????????????????????????????  MediaStream ???
			if (navigator.mediaDevices.getDisplayMedia) {
				this.setState({ screenAvailable: true })
			} else {
				this.setState({ screenAvailable: false })
			}

			if (this.videoAvailable || this.audioAvailable) {
				navigator.mediaDevices.getUserMedia({ video: this.videoAvailable, audio: this.audioAvailable })
					.then((stream) => {
						window.localStream = stream
						if(this.localVideoRef.current){
							this.localVideoRef.current.srcObject = stream
						}
					})
					.then((stream) => {
					})
					.catch((e) => console.log(e))
			}
		} catch(error) { console.log(error) }
	}

	getMedia = () => {
		this.setState({
			video: this.videoAvailable,
			audio: this.audioAvailable
		}, () => {
			this.getUserMedia()
			this.connectToSocketServer()
		})
	}

	getUserMedia = (props) => {
		if ((this.state.video && this.videoAvailable) || (this.state.audio && this.audioAvailable)) {
			navigator.mediaDevices.getUserMedia({ video: this.state.video, audio: this.state.audio })
				.then(this.getUserMediaSuccess)
				.then((stream) => {
				})
				.catch((e) => console.log(e))
		} else {
			try {
				let tracks = this.localVideoRef.current.srcObject.getTracks()//MediaStream ?????????getTracks() ???????????????????????????  track set ???????????? MediaStreamTrack  ???????????????
				tracks.forEach(track => track.stop())
			} catch (e) {}
		}
	}

	getUserMediaSuccess = (stream) => {
		try {
			// ?????????localStream?????????
			window.localStream.getTracks().forEach(track => track.stop())
		} catch(e) { console.log(e) }

		window.localStream = stream
		this.localVideoRef.current.srcObject = stream

		for (let id in connections) {
			if (id === socketId) continue

			connections[id].addStream(window.localStream)
			connections[id].createOffer().then((description) => {
				connections[id].setLocalDescription(description)
					.then(() => {
						socket.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
					})
					.catch(e => console.log(e))
			})
		}

		stream.getTracks().forEach(track => track.onended = () => {
			this.setState({
				video: false,
				audio: false,
			}, () => {
				// callback
				try {
					let tracks = this.localVideoRef.current.srcObject.getTracks()
					tracks.forEach(track => track.stop())
				} catch(e) { console.log(e) }

				let blackSilence = (...args) => new MediaStream([this.black(...args), this.silence()])
				// let blackSilence = (...args) => new MediaStream([this.silence()])
				window.localStream = blackSilence()
				this.localVideoRef.current.srcObject = window.localStream

				for (let id in connections) {
					connections[id].addStream(window.localStream)
					connections[id].createOffer().then((description) => {
						connections[id].setLocalDescription(description)
						.then(() => {
							this.flipVideoDirection()
								socket.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
							})
							.catch(e => console.log(e))
					})
				}
			})
		})
	}
	mergeTracks = (baseStrem, extraStream) => {
    if (!baseStrem.getAudioTracks().length) {
        baseStrem.addTrack(extraStream.getAudioTracks()[0])
        return baseStrem;
    }
    const context = new AudioContext();
    const baseSource = context.createMediaStreamSource(baseStrem);
    const extraSource = context.createMediaStreamSource(extraStream);
    const dest = context.createMediaStreamDestination();

    const baseGain = context.createGain();
    const extraGain = context.createGain();//???????????????
    baseGain.gain.value = 0.8;
    extraGain.gain.value = 1;

    baseSource.connect(baseGain).connect(dest);
    extraSource.connect(extraGain).connect(dest);

    return new MediaStream([baseStrem.getVideoTracks()[0], dest.stream.getAudioTracks()[0]]);
}

	// ??????????????????;
	getDisplayMedia = (event) => {
		if (this.state.screen) {
			if (navigator.mediaDevices.getDisplayMedia) {
				let shareWindowUser=this.shareScreen.current.dataset.user;
				let microAudio;//?????????????????????
				// ===========
				navigator.mediaDevices.getUserMedia({
					video: true,
					audio:true,
			}).then((audioStream)=>{
				
				// var stream = mergeTracks(userStream, audioStream);
				microAudio=audioStream;
				console.log(microAudio.getTracks(), audioStream.getTracks());
			})
					navigator.mediaDevices.getDisplayMedia({ video: true, 
						audio:true
					})
						.then((stream)=>{
							this.getDisplayMediaSuccess(stream,microAudio)
						})
						.then((stream) => {
						})
						.catch((e) => console.log(e))
			}
		}
	}

	getDisplayMediaSuccess = (stream,microAudio) => {
		try {
			window.localStream.getTracks().forEach(track => track.stop())
		} catch(e) { console.log(e) }
		// console.log(userStream.getTracks(), audioStream.getTracks());
		//  stream = mergeTracks(userStream, audioStream);
		stream=this.mergeTracks(stream, microAudio);
		window.localStream = stream
		this.localVideoRef.current.srcObject = stream

		for (let id in connections) {
			if (id === socketId) continue

			connections[id].addStream(window.localStream)

			connections[id].createOffer().then((description) => {
				connections[id].setLocalDescription(description)
					.then(() => {
						socket.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }))
						// this.flipVideoDirection() //?????????????????????????????????
					})
					.catch(e => console.log(e))
			})
		}

		stream.getTracks().forEach(track => track.onended = () => {
			this.setState({
				screen: false,
			}, () => {
				try {
					let tracks = this.localVideoRef.current.srcObject.getTracks()
					tracks.forEach(track => track.stop())
				} catch(e) { console.log(e) }
				// ????????????????????????????????????
				// let blackSilence = (...args) => new MediaStream([this.black(...args), this.silence()])
				let blackSilence = (...args) => new MediaStream([this.silence()])
				window.localStream = blackSilence()//return?????????stream
				this.localVideoRef.current.srcObject = window.localStream

				this.getUserMedia()
			})
		})
	}

	gotMessageFromServer = (fromId, message) => {
		var signal = JSON.parse(message)

		if (fromId !== socketId) {
			if (signal.sdp) {
				// ??????????????????user?????????????????????
				connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
					if (signal.sdp.type === 'offer') {
						connections[fromId].createAnswer().then((description) => {
							connections[fromId].setLocalDescription(description).then(() => {
								socket.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }))
							}).catch(e => {
								console.log(e)
							})
						}).catch(e => console.log(e))
					}
				}).catch(e => console.log(e))
			}

			if (signal.ice) {
				/* 
				???????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????RTCSessionDescription?????????
				????????????setRemoteDescription???????????????????????????RTCPeerConnection???????????????????????????RTCIceCandidate?????????
				????????????addIceCandidate???????????????????????????RTCPeerConnection?????????
				*/
				connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
			}
		}
	}
	flipVideoDirection=()=>{
		let main = document.getElementById('main')
		let videos = main.querySelectorAll("video")
		for (let a = 0; a < videos.length; ++a) {
			if(videos[a].dataset.user==this.state.flipVideo){
				// videos[a].style.setProperty('transform',"rotateY(360deg)") 
			} 
		}
	}

	shakeWindow=(e, sender, socketIdSender)=>{
		let dom=document.getElementById(e)
		if (socketIdSender !== socketId && !dom) {
		// ????????????????????????
			this.shakeWindow2('mainChat',sender, socketIdSender);
		}
		else if(socketIdSender !== socketId && dom){
			this.shakeWindow2('mainChat',sender, socketIdSender);
		}
		if(!dom){
			return;
		};

		dom.style.setProperty( 'animation',`shake 0.2s infinite`);
		setTimeout(() => {
				dom.style.removeProperty('animation');
		}, 600);

	}
	shakeWindow2=(name,sender, socketIdSender)=>{
	if(! this.state.showModal){
		this.setState({ showModal: true},()=>this.goShake(name,sender, socketIdSender))
	}
	}
	goShake=(name,sender, socketIdSender)=>{
		let dom=document.getElementById('mainChat')
		if(!dom){ return}
		dom.style.setProperty( 'animation',`shake 0.2s infinite`);
		setTimeout(() => {
				dom.style.removeProperty('animation');
		}, 600);
		if (sender == socketId) {
			this.setState({ newMessages: 0 })
		}
		if (socketIdSender == socketId) {
			this.setState({ newMessages: 0 })
		}
	}

	containsShake=(data)=>{
		if(data.indexOf('*shake*')!=-1){
			return true;
		}
		return false;
	}
	
	checkUsedIcon=(str)=>{
		if(str==='icon1') return this.state.iconUsed1;
		else if(str==='icon2') return 'iconUsed2';
		else if(str==='icon3') return 'iconUsed3';
		else if(str==='icon4') return 'iconUsed4';
		else if(str==='icon5') return 'iconUsed5';
		else if(str==='icon6') return 'iconUsed6';
	}


	connectToSocketServer = () => {
		socket = io.connect(server_url, { path:'/mysocket'})

		socket.on('signal', this.gotMessageFromServer)
		socket.on('connect', () => {
			// ???????????????default icon
			// this.loadIconList()
			socket.emit('join-call', this.props.location.state.roomId, this.state.selectedImg,this.state.username)
			socketId = socket.id
			socket.on('chat-message', this.addMessage)
			socket.on("shake",this.shakeWindow)
			socket.on('user-left', (id) => {
				this.loadIconList()
				let video = document.querySelector(`[data-socket="${id}"]`)
				// ?????????
				if (video !== null) {
					elms--
					// ????????????????????????
					video.parentNode.removeChild(video)

					let main = document.getElementById('main')
					changeCssVideos(main,elms)
				}
			})

			socket.on('user-joined', (id, clients,userIcon) => {
				this.loadIconList()
				clients.forEach((socketListId) => {
					// ??????RTCPeerConnection??????
					connections[socketListId] = new RTCPeerConnection(peerConnectionConfig)
					// ??????ice?????????, ??????onicecandidate??????????????????????????????ICE???????????????????????????????????????      
					connections[socketListId].onicecandidate = function (event) {
						if (event.candidate != null) {
							socket.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }))
						}
					}

					// ??????????????? 
					// ??????onaddstream???????????????????????????????????????????????????????????????????????????????????????
					connections[socketListId].onaddstream = (event) => {
						var searchVidep = document.querySelector(`[data-socket="${socketListId}"]`)
						if (searchVidep !== null) { 
							searchVidep.srcObject = event.stream
						} else {
							elms = clients.length//???????????? ???????????????
							let main = document.getElementById('main')
							let divCollection=document.querySelectorAll('#main > div ')
							let cssMesure = changeCssVideos(main,elms)
							// ??????video
							let video = document.createElement('video')
							let div=document.createElement('div')
							video.setAttribute("controls","controls")
							video.setAttribute("poster",poster2)
								let css = {minWidth: cssMesure.minWidth, maxHeight:'90%',minHeight: cssMesure.minHeight,
								margin: "10px",marginBottom:'80px',marginTop:'30px',
								borderStyle: "solid", borderColor: "#bdbdbd", objectFit: "fill"}
								
								for(let i in css) video.style[i] = css[i]
								// ?????????????????????????????????????????????
								video.style.setProperty("width", cssMesure.width)
								video.style.setProperty("height", cssMesure.height)
								video.setAttribute('data-socket', socketListId)
								video.srcObject = event.stream
								video.autoplay = true
								video.playsinline = true
								main.appendChild(video)//??????????????????????????????
								// ????????????dom div,?????????????????????
								if(divCollection){
									for(let dom of divCollection){
										main.removeChild(dom);
									}
								}
								div.style.setProperty("width",'100%')
								div.style.setProperty("height",'0.5px')
								div.style.setProperty("visibility",'hidden')
							  main.appendChild(div)
						}
					}

					/* ??????
					RTCPeerConnection.addStream()
          Adds a MediaStream as a local source of video or audio.
					*/
					if (window.localStream !== undefined && window.localStream !== null) {
						// ??????getUserMedia???????????????????????????????????????addStream???????????????????????????RTCPeerConnection?????????
						connections[socketListId].addStream(window.localStream)
					} else {
						let blackSilence = (...args) => new MediaStream([this.black(...args), this.silence()])
						// let blackSilence = (...args) => new MediaStream([ this.silence()])
						window.localStream = blackSilence()
						connections[socketListId].addStream(window.localStream)
					}
				})

				if (id === socketId) {
					for (let id2 in connections) {
						if (id2 === socketId) continue
						
						try {
							connections[id2].addStream(window.localStream)
						} catch(e) {}
						/* 
						????????????/?????????????????????????????????????????????????????????????????????????????????????????????createOffer???????????????????????????
						???????????????RTCSessionDescription????????????????????????????????????????????????setLocalDescription??????
						?????????RTCSessionDescription?????????????????????RTCPeerConnection?????????
						*/
						connections[id2].createOffer().then((description) => {
							connections[id2].setLocalDescription(description)
								.then(() => {
									socket.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }))
								})
								.catch(e => console.log(e))
						})
					}
				}
			})
		})
	}
// ??????
	silence = () => {
		let ctx = new AudioContext()
		// createOscillator???????????????OscillatorNode????????????????????????????????? ???????????????????????????????????????
		let oscillator = ctx.createOscillator()

		let dst = oscillator.connect(ctx.createMediaStreamDestination())
		// AudioBufferSourceNode?????????start?????????????????????????????????????????????????????????????????????????????????????????????
		oscillator.start()
		// AudioContext?????????resume???????????????????????????????????????????????????????????????????????????
		ctx.resume()
		// ???????????????
		dst.stream.getAudioTracks()[0].applyConstraints({echoCancellation: false});
		return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
	}

	// ??????
	black = ({ width = 640, height = 480 } = {}) => {
		let canvas = Object.assign(document.createElement("canvas"), { width, height })
		const ctx=canvas.getContext('2d')
		canvas.getContext('2d').fillRect(0, 0, width, height)
		canvas.getContext('2d').fillStyle="#000"
		// ctx.drawImage(poster2,0,0);
		let stream = canvas.captureStream()
		return Object.assign(stream.getVideoTracks()[0], { enabled: false })
	}
	// ??????toggle??????
	handleVideo = () => this.setState({ video: !this.state.video }, () => this.getUserMedia())
	handleAudio = () => this.setState({ audio: !this.state.audio }, () => this.getUserMedia())
	handleScreen = (e) => {
		this.setState({ screen: !this.state.screen }, (e) => this.getDisplayMedia(e))
	}

	// ????????????
	handleEndCall = () => {
		try {
			let tracks = this.localVideoRef.current.srcObject.getTracks()
			tracks.forEach(track => track.stop())
		} catch (e) {}
		window.location.href = "/"
	}
	// ??????
	saveScreen=()=>{
		const screen = document.querySelectorAll("video");
		console.log(screen)
		let update=[];
		const that=this
		for(let item of screen){
			let canvas
			// ??????mozilla??????
			if(videoCanvas(item)){
				 canvas = videoCanvas(item);
			}
			const imgUrl = canvas.toDataURL('image/png');
			if(imgUrl){update.push(imgUrl)}
		}
		this.setState({
			screenData:update
		},()=>{
			console.log(this.state.screenData.length)
			this.setState({screenVisible:true});
		})
	}
	 mirrorImage(ctx, image, x = 0, y = 0, horizontal = false, vertical = false){
    ctx.save();  // save the current canvas state
    ctx.setTransform(
        horizontal ? -1 : 1, 0, 
        0, vertical ? -1 : 1,   
        x + (horizontal ? image.width : 0), 
        y + (vertical ? image.height : 0)   
    );
    return ctx.drawImage(image,0,0);
    ctx.restore(); // restore the state as it was when this function was called
}

// ??????
 showDrawer = () => {this.setState({drawerVisible:true})}
 closeDrawer = () => {this.setState({drawerVisible:false})};

	// ????????????
	handleOk = e => {this.setState({screenVisible: false,screenData:[]})};
  handleCancel = e => {this.setState({screenVisible: false,screenData:[]})};

	// ?????????????????????;
	openChat = () => this.setState({ showModal: true, newMessages: 0 })
	closeChat = () => this.setState({ showModal: false })
	handleMessage = (e) => this.setState({ message: e.target.value })

	addMessage = (data, sender, socketIdSender,icon) => {
		this.setState(prevState => ({
			// ??????
			// "icon":this.props.location.state['userIcon']
			messages: [...prevState.messages, { "sender": sender, "data": data,"icon":icon}],
		}))
		if (socketIdSender !== socketId) {
			if(this.state.showModal===false){this.setState({ newMessages: this.state.newMessages + 1 })}
			else{this.setState({newMessages:0})}
		}
	}

	handleUsername = (e) => this.setState({ username: e.target.value })

	sendMessage = () => {
		let copy=this.state.message
		if(copy.replace(/ /g,'').length===0){ 
			this.setState({message:''})
			return
		};
		// ??????
		socket.emit('chat-message', this.state.message, this.state.username,this.state.selectedImg)
		this.setState({ message: "", sender: this.state.username })
	}
	sendShake=(dom)=>{
		socket.emit('shake',dom,this.state.username)
	}
	// ????????????url
	copyUrl = () => {
		let text = `Room:${this.props.location.state.roomId} Password:${this.props.location.state.originalP}`
		// ???????????????
		if (!navigator.clipboard) {
			let textArea = document.createElement("textarea")
			textArea.value = text
			document.body.appendChild(textArea)
			textArea.focus()
			textArea.select()
			try {
				document.execCommand('copy')
				message.success("Room info copied to clipboard!")
			} catch (err) {
				message.error("Failed to copy")
			}
			document.body.removeChild(textArea)
			return
		}
		navigator.clipboard.writeText(text).then(function () {
			message.success("Room info copied to clipboard!")
		}, () => {
			message.error("Failed to copy")
		})
	}

	connect = () =>{
		// ?????????:

		let res=this.state.selectedImg;
		let username=this.state.username;
		if(res===''){
			message.info('Please select a user icon')
			return 
		}
		if(username.replace(/ /g,'').length===0){ 
			message.info('Please enter username.')
			this.setState({username:''})
			return
		}
		if(username.length>20){
			message.info("username length up to 20")
			return
		}
		return  this.setState({ askForUsername: false }, () => this.getMedia())
	}

 myBrowser=()=>{
	const userAgent = navigator.userAgent; 
	let res;
	if(navigator.vendor){ 
		if(navigator.vendor.toLowerCase().indexOf('google inc')>-1){res=true }
	}
	else if (userAgent.toLowerCase().indexOf("chrome/") > -1){res= true}
	else{ res=false }
	if(!res){
				// ???????????????????????????
		this.setState({myBrowser:false,video: false,audio:false},()=>{
			const info={
				_id:this.props.location.state.roomId,
				_password:this.props.location.state.originalP
			}
			leaveRoom(info).then((res)=>{
				// user left.  delete 1.
				console.log('user left')
			}).catch((err)=>{ console.log(err)})
		});
	}
	else{
	}
}
 throttle=(fn, timeout, context)=>{
	//???????????????????????????????????????
	if(!fn.lastExec){
		fn.lastExec = Date.now();
		fn.call(context);
	}else{
		//??????????????? --- ?????????????????????????????????????????????????????????timeout
		var remaining = Date.now() - fn.lastExec;
		if(remaining > timeout){
			//?????????
			console.log(navigator.userAgent)
			console.log(navigator.vendor)
			fn.lastExec = Date.now();
			fn.call(context);
		}
	};
}

	updateFileList=(file)=>{
		this.setState({	fileList: [...this.state.fileList, ...file.fileList]},()=>{
			let temp=file.fileList[0].originFileObj
			let imageBase64=getBase64(temp)
			imageBase64.then((res)=>{

				socket.emit('chat-message', res, this.state.username, this.state.selectedImg)
				this.setState({ message: "", sender: this.state.username })
				this.setState({ fileList: []})
			})
		});
	}
	checkShake=(data,sender, socketIdSender)=>{
			 return (<MessageBox >
				 <p style={{ wordBreak: "break-all" }}>{data}</p>
				 </MessageBox>
			 )
	}
	checkShakeLeft=(data,sender, socketIdSender)=>{
			 return (<MessageBoxLeft >
				 <p style={{ wordBreak: "break-all" }}>{data}</p>
				 </MessageBoxLeft>
			 )
	}
	checkImgFromList=()=>{
		let list=this.state.iconList;
		let temp=['icon1','icon2','icon3','icon4','icon5','icon6'];
		let list1=temp.filter((val)=>!list.includes(val)) //?????????????????????
		let res=Number(list1[0][4]);
			if(list1.length>=1){ return res}

	}
	changeImg=(e)=>{
    this.setState({
			selectedImg:`icon${e.target.value}`
		},()=>{
			this.props.location.state['userIcon']=`icon${e.target.value}`
		});	
	}
	checkUserImg=(str)=>{
		if(str==='icon1') return icon1
		if(str==='icon2') return icon2
		if(str==='icon3') return icon3
		if(str==='icon4') return icon4
		if(str==='icon5') return icon5
		if(str==='icon6') return icon6
	}

	checkIconList=(str)=>{
		let res=this.state.iconList.includes(str)
		return res;
	}
	fileTypeCheck=(file)=>{
let index=file.name.lastIndexOf(".")
let _fileName=file.name.substr(index+1);
			if (_fileName == 'png' ||
			_fileName == 'jpg'   ||
			_fileName == 'jpeg'  
			) {
				message.loading({
					content:`Upload Successfully, Loading...`,
					style: {
						zIndex: '9999',
						marginTop:'85vh'
					},
					duration:1
			});
				return true;
			}else{
				this.setState({ fileList: []})
				return false;
			}
	}

	imagProps={
		action:'',
		beforeUpload: file => {
		return false;
		},
		onChange: file => {
		// console.log(file)
			 let flag=this.fileTypeCheck(file.file);
			if(flag===false){
				message.error({
					content:`${file.file.name} is not a valid file`,
					style: {
						zIndex: '9999',
						marginTop:'85vh'
					},
					duration:1
				});
				this.setState({ fileList: []})
				return;
			}
			else{
				this.updateFileList(file);
			}
			return true;

		},
		progress: {
			strokeColor: {
				'0%': '#108ee9',
				'100%': '#87d068',
			},
			strokeWidth: 3,
			format: percent => `${parseFloat(percent.toFixed(2))}%`,
		},

		
	}
	render() {
		const radioStyle = {
      display: 'block',
      height: '30px',
      lineHeight: '30px',
    };
		// if(this.myBrowser() === false){
		if(this.state.myBrowser=== false){
			return (
				<Error></Error>
			)
		}
		return (
		<Fragment >
			<GlobalStyle></GlobalStyle>
			<div  className="screenShot">
				{this.state.askForUsername === true ?
					<div>
						<div style={{background: "white",borderRadius:'20px', width: "92%", height: "270px", padding: "20px",
								textAlign: "center", margin: "auto", marginTop: "50px", justifyContent: "center"}}>
							<p style={{ marginBottom:'10px', fontWeight: "bold" }}>SET USERNAME AND AVATAR</p>
							<Input 
							style={{width:'40%'}}
							 placeholder="Username" value={this.state.username} onChange={e => this.handleUsername(e)} />
							 <div style={{marginTop:'20px',height:'50px',width:'100%'}}>
							 <Radio.Group onChange={(e)=>{this.changeImg(e)}} buttonStyle="solid" >
							 {/* this.checkIconList('icon2') */}
									<Radio style={radioStyle} value={1} style={{marginBottom:'10px'}} disabled={this.checkIconList('icon1')}>
									<IconImages src={icon1}></IconImages>
									</Radio>
									<Radio style={radioStyle} value={2} style={{marginBottom:'10px'}} disabled={this.checkIconList('icon2')} >
									<IconImages src={icon2}></IconImages>
									</Radio>
									<Radio style={radioStyle} value={3} style={{marginBottom:'10px'}} disabled={this.checkIconList('icon3')} >
									<IconImages src={icon3}></IconImages>
									</Radio>
									<Radio style={radioStyle} value={4} style={{marginBottom:'10px'}} disabled={this.checkIconList('icon4')} >
									<IconImages src={icon4}></IconImages>
									</Radio>
									<Radio style={radioStyle} value={5}  style={{marginBottom:'10px'}} disabled={this.checkIconList('icon5')} >
									<IconImages src={icon5}></IconImages>
									</Radio>
									<Radio style={radioStyle} value={6}  style={{marginBottom:'10px'}} disabled={this.checkIconList('icon6')} >
									<IconImages src={icon6}></IconImages>
									</Radio>
								</Radio.Group>
					<div>	<ButtonAnt type="primary" onClick={()=>{this.connect()}} style={{ margin: "10px" }}>Connect</ButtonAnt></div>
							 </div>
						</div>
						<div style={{ justifyContent: "center", textAlign: "center", paddingTop: "40px" }}>
							<VideoBox 
							// id="my-video123123"
							// poster={poster2}
							className="initialVideo"
							controls
							onclick={(e)=>toggleVideoSize(e)}
							data-user={this.state.username}  data-icon={this.state.selectedImg} ref={this.localVideoRef} autoPlay muted ></VideoBox>
						</div>
					</div>
					:
					<div>

						{/* ????????? */}
						<Modal id="mainChat" show={this.state.showModal} onHide={this.closeChat} style={{ height:'90%' }}>
							<Modal.Header closeButton>
								<Modal.Title style={{marginLeft:'40%'}}>iMessage</Modal.Title>
							</Modal.Header>
							<Modal.Body  id="messageBody" style={{ overflow: "auto", overflowY: "auto", height: "60vh",width:'100%', textAlign: "left" ,
							background:`url(${chatWallPaper}) repeat-Y top`,
						
							}}
							 >
								{this.state.messages.length > 0 
								? 
								this.state.messages.map((item, index) => {
							  {scrollToBottom()}
								return (
									this.state.username===item.sender)
									?
							    (
									<UserContainer key={`${index}--${item.sender}`}>
									<Sender >
									<div>
									<img src={this.checkUserImg(item.icon)}
									title='user'
									style={{width:'35px',height:'35px', borderRadius:'50%'}}
									 alt="uer icon"/>
									 </div>
									
									</Sender>
									{checkMessage(item.data)
									?
									(
										<ImageBox>
										<Image src={item.data}/>
										</ImageBox>
									)
									:
									this.checkShake(item.data)
									}
										
									</UserContainer>
									)
									:
								  (
										<UserContainer key={`${index}--${item.sender}`}>	
									<SenderLeft >
									<div>
									<img src={this.checkUserImg(item.icon)}
									style={{width:'35px',height:'35px',borderRadius:'50%'}}
									 alt="uer icon"/>
									 </div>
									</SenderLeft>
									
									{checkMessage(item.data) 
									?
									<ImageBoxLeft>
									<Image src={item.data}/>
									</ImageBoxLeft>
									:
									this.checkShakeLeft(item.data)
									}
									</UserContainer>
									)
								}) 
								: 
								<p style={{textAlign:'center'}}>---No messages history---</p>}
							</Modal.Body>
							<Modal.Footer className="div-send-msg">
								
								<Upload 
							{...this.imagProps}
							fileList={this.state.fileList}
							>
									<ButtonAnt style={{backgroundColor:'#146c89'}} type="primary" icon={<UploadOutlined />}>Image</ButtonAnt>
							</Upload>
							<ShakeOutlined onClick={()=>this.sendShake('mainChat')}
								 />
								
							<div style={{width:'100%'}}>
							<Input placeholder="Message" value={this.state.message} 
								style={{width:'60%'}}
								onPressEnter={()=>this.sendMessage()}
								onChange={e => this.handleMessage(e)} />
								<ButtonAnt  type="primary" onClick={()=>this.sendMessage()}>Send</ButtonAnt>
							</div>
							</Modal.Footer>
						</Modal>
						<MessageContainer >
							<div style={{ paddingTop: "20px" }}>
								<Input 
								value={`Room:${this.props.location.state.roomId} Password:${this.props.location.state.originalP}`} 
								style={{color:'black',width:'40%'}} 
							// 
								></Input>
								<ButtonAnt type="primary" style={{backgroundColor: "#3f51b5",color: "whitesmoke",marginLeft: "20px",
									marginTop: "10px",width: "120px",fontSize: "10px"
								}} onClick={this.copyUrl}>Copy Room Info</ButtonAnt>
							</div>

							<Row id="main" style={{margin:'0px',padding:'0px'}} className="flex-container" >
								<VideoBox id="my-video"
								style={{borderRadius:'20px',height:'100%'}}
								controls
								poster={poster2}
								 data-user={this.state.username} data-icon={this.state.selectedImg} ref={this.localVideoRef} autoPlay muted ></VideoBox>
							</Row>
						</MessageContainer>
						{/* ??????Icons */}
						<IconList  style={{
							 backgroundColor: "whitesmoke", color: "whitesmoke", textAlign: "center" }}>

							<IconButton style={{ color: "#f44336" }} onClick={()=>this.handleEndCall()}>
								<CallEndIcon />
							</IconButton>
							<IconButton  onClick={()=>this.saveScreen()} >
							<CameraOutlined />
							</IconButton>
									<AntModal
									title="ScreenShot"
									centered
									visible={this.state.screenVisible}
									okText="ok"
									cancelText="close"
									onOk={() =>this.handleOk()}
									onCancel={() =>this.handleCancel()}
									width={1050}
								>
											<div>
											{
																this.state.screenData.length!==0 ?
																this.state.screenData.map((item,index)=>{
																return (
																	<Image
																	key={index}
																style={{marginRight:'30px',marginBottom:'20px'}}
																height={350}
																width={300}
																src={item}
																alt="video screenshot"
																			fallback="data:image/png;base64,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"
																></Image>
																)})
																:
																null
															}
											</div>
								</AntModal>
							<IconButton style={{ color: "#424242" }} onClick={()=>this.handleVideo()}>
								{(this.state.video === true) ? <VideocamIcon /> : <VideocamOffIcon />}
							</IconButton>

							<IconButton style={{ color: "#424242" }} onClick={()=>this.handleAudio()}>
								{this.state.audio === true ? <MicIcon /> : <MicOffIcon />}
							</IconButton>

							{/* ???????????? */}
							{this.state.screenAvailable === true ?
								<IconButton
								 ref={this.shareScreen}
								 data-user={this.state.username} 
								 data-icon={this.state.selectedImg}
								 style={{ color: "#424242" }} onClick={(e)=>this.handleScreen(e)}>
									{this.state.screen === true ? <ScreenShareIcon /> : <StopScreenShareIcon />}
								</IconButton>
								: null}

							<Badge badgeContent={this.state.newMessages} max={999} color="secondary" onClick={()=>this.openChat()}>
								<IconButton style={{ color: "#424242" }} onClick={()=>this.openChat()}>
									<ChatIcon />
								</IconButton>
							</Badge>
							{/* ?????? */}
								<IconButton style={{ color: "#424242" }} onClick={()=>this.showDrawer()}>
								<UserOutlined />
								</IconButton>
								<Drawer
									title="User List"
									placement="right"
									closable={false}
									onClose={()=>this.closeDrawer()}
									visible={this.state.drawerVisible}
								>
								{this.state.userList.length!==0 ?
								this.state.userList.map((v,i)=>{
									return (
										<DrawerItem key={v + i}  >
											<img src={this.checkUserImg(this.state.iconList[i])} 
											style={{width:'40px',height:'40px',borderRadius:'50%',marginTop:'-2px'}}
											alt="user info"/>
											<span style={{height:'40px',lineHeight:'40px',marginLeft:'10px'}}>{v}</span>
										</DrawerItem>
									)
								})
								:
								null
								}
      </Drawer>
						</IconList>
					</div>
				}
			</div>
		</Fragment>
		)
	}
}

export default withRouter(Video)
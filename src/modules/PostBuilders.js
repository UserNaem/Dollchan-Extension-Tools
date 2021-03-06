/*==[ PostBuilders.js ]=======================================================================================
                                          BUILDERS FOR LOADED POSTS
============================================================================================================*/

class DOMPostsBuilder {
	constructor(form, isArchived) {
		this._form = form;
		this._posts = $Q(aib.qRPost, form);
		this.length = this._posts.length;
		this.postersCount = '';
		this._isArchived = isArchived;
	}
	get isClosed() {
		return aib.qClosed && !!$q(aib.qClosed, this._form) || this._isArchived;
	}
	getOpMessage() {
		return aib.fixHTML(doc.adoptNode($q(aib.qPostMsg, this._form)));
	}
	getPostEl(i) {
		return aib.fixHTML(this._posts[i]);
	}
	getPNum(i) {
		return aib.getPNum(this._posts[i]);
	}
	* bannedPostsData() {
		var bEls = $Q(aib.qBan, this._form);
		for(let i = 0, len = bEls.length; i < len; ++i) {
			let bEl = bEls[i],
				pEl = aib.getPostElOfEl(bEl);
			yield [1, pEl ? aib.getPNum(pEl) : null, doc.adoptNode(bEl)];
		}
	}
}
DOMPostsBuilder.fixFileName = function(name, maxLength) {
	const decodedName = name.replace(/&amp;/g, '&')
			.replace(/&quot;/g, '"')
			.replace(/&#039;/g, "'")
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>');
	if(decodedName.length > maxLength) {
		return {
			isFixed: true,
			name: decodedName.slice(0, 25)
			                 .replace(/&/g, '&amp;')
			                 .replace(/"/g, '&quot;')
			                 .replace(/'/g, '&#039;')
			                 .replace(/</g, '&lt;')
			                 .replace(/>/g, '&gt;')
		};
	}
	return { isFixed: false, name };
};

class _4chanPostsBuilder {
	static _setCustomSpoiler(board, val) {
		if(!_4chanPostsBuilder._customSpoiler[board] && (val = parseInt(val))) {
			let s;
			if(board === aib.brd && (s = $q('.imgspoiler'))) {
				_4chanPostsBuilder._customSpoiler.set(board,
					s.firstChild.src.match(/spoiler(-[a-z0-9]+)\.png$/)[1]);
			}
		} else {
			_4chanPostsBuilder._customSpoiler.set(board, '-' + board + (Math.floor(Math.random() * val) + 1));
		}
	}
	constructor(json, brd) {
		this._posts = json.posts;
		this._brd = brd;
		this.length = json.posts.length - 1;
		this.postersCount = this._posts[0].unique_ips;
		if(this._posts[0].custom_spoiler) {
			_4chanPostsBuilder._setCustomSpoiler(brd, this._posts[0].custom_spoiler);
		}
	}
	get isClosed() {
		return !!(this._posts[0].closed || this._posts[0].archived);
	}
	getOpMessage() {
		const data = this._posts[0];
		return $add(aib.fixHTML(`<blockquote class="postMessage" id="m${ data.no }"> ${ data.com }</blockquote>`));
	}
	getPostEl(i) {
		return $add(aib.fixHTML(this.getPostHTML(i))).lastElementChild;
	}
	getPostHTML(i) {
		const data = this._posts[i + 1];
		const num = data.no;
		const brd = this._brd;
		const _icon = id => `//s.4cdn.org/image/${ id }${ window.devicePixelRatio >= 2 ? '@2x.gif' : '.gif'}`;

		// --- FILE ---
		let fileHTML = '';
		if(data.filedeleted) {
			fileHTML = `<div id="f${ num }" class="file"><span class="fileThumb">
				<img src="${ _icon('filedeleted-res') }" class="fileDeletedRes" alt="File deleted.">
			</span></div>`;
		} else if(typeof data.filename === 'string') {
			let { name, isFixed: needTitle} = DOMPostsBuilder.fixFileName(data.filename, 30);
			name += data.ext;
			if(!data.tn_w && !data.tn_h && data.ext === '.gif') {
				data.tn_w = data.w;
				data.tn_h = data.h;
			}
			const isSpoiler = data.spoiler && !Cfg.noSpoilers;
			if(isSpoiler) {
				name = 'Spoiler Image';
				data.tn_w = data.tn_h = 100;
				needTitle = false;
			}
			const size = prettifySize(data.fsize);
			fileHTML = `<div class="file" id="f${ num }">
				<div class="fileText" id="fT${ num }" ${
					isSpoiler ? `title="${ data.filename + data.ext }"` : ''
				}>File: <a href="//i.4cdn.org/${ brd }/${ data.tim + data.ext }" ${
					needTitle ? `title="${ data.filename + data.ext }"` : ''
				} target="_blank">${ name }</a> (${ size }, ${
					data.ext === '.pdf' ? 'PDF' : data.w + 'x' + data.h
				})</div>
				<a class="fileThumb ${ isSpoiler ? 'imgSpoiler' : '' }" href="//i.4cdn.org/${ brd }/${ data.tim + data.ext }" target="_blank">
					<img src="${ isSpoiler ?
						'//s.4cdn.org/image/spoiler' + _4chanPostsBuilder._customSpoiler.get(brd) || '' + '.png' :
						'//i.4cdn.org/' + brd + '/' + data.tim + 's.jpg'
					}" alt="${ size }" data-md5="${ data.md5 }" style="height: ${ data.tn_h }px; width: ${ data.tn_w }px;">
					<div data-tip="" data-tip-cb="mShowFull" class="mFileInfo mobile">${ size } ${ data.ext.substr(1).toUpperCase() }</div>
				</a>
			</div>`;
		}

		// --- CAPCODE ---
		let highlight = '', capcodeText = '', capcodeClass = '', capcodeImg = '';
		switch(data.capcode) {
		case 'admin_highlight':
			highlight = ' highlightPost';
			/* falls through */
		case 'admin':
			capcodeText = '<strong class="capcode hand id_admin" title="Highlight posts by Administrators">## Admin</strong>';
			capcodeClass = 'capcodeAdmin';
			capcodeImg = `<img src="${ _icon('adminicon') }" alt="This user is a 4chan Administrator." title="This user is a 4chan Administrator." class="identityIcon">`;
			break;
		case 'mod':
			capcodeText = '<strong class="capcode hand id_mod" title="Highlight posts by Moderators">## Mod</strong>';
			capcodeClass = 'capcodeMod';
			capcodeImg = `<img src="${ _icon('modicon') }" alt="This user is a 4chan Moderator." title="This user is a 4chan Moderator." class="identityIcon">`;
			break;
		case 'developer':
			capcodeText = '<strong class="capcode hand id_developer" title="Highlight posts by Developers">## Developer</strong>';
			capcodeClass = 'capcodeDeveloper';
			capcodeImg = `<img src="${ _icon('developericon') }" alt="This user is a 4chan Developer." title="This user is a 4chan Developer." class="identityIcon">`;
			break;
		case 'manager':
			capcodeText = '<strong class="capcode hand id_manager" title="Highlight posts by Managers">## Manager</strong>';
			capcodeClass = 'capcodeManager';
			capcodeImg = `<img src="${ _icon('managericon') }" alt="This user is a 4chan Manager." title="This user is a 4chan Manager." class="identityIcon">`;
			break;
		case 'founder':
			capcodeText = '<strong class="capcode hand id_admin" title="Highlight posts by the Founder">## Founder</strong>';
			capcodeClass = ' capcodeAdmin';
			capcodeImg = `<img src="${ _icon('foundericon') }" alt="This user is 4chan\'s Founder." title="This user is 4chan\'s Founder." class="identityIcon">`;
			break;
		}

		const name = data.name || '';

		return `<div class="postContainer replyContainer" id="pc${ num }">
			<div class="sideArrows" id="sa${ num }">&gt;&gt;</div>
			<div id="p${ num }" class="post ${ i === -1 ? 'op' : 'reply' } ${ highlight }">
				<div class="postInfoM mobile" id="pim${ num }">
					<span class="nameBlock ${ capcodeClass }">
						${ name.length > 30 ?
							'<span class="name" data-tip data-tip-cb="mShowFull">' + name.substring(30) + '(...)</span>' :
							'<span class="name">' + name + '</span>'
						}
						${ data.trip ? `<span class="postertrip">${ data.trip }</span>` : '' }
						${ capcodeText }
						${ capcodeImg }
						${ data.id && !data.capcode ? `<span class="posteruid id_${ data.id }">(ID: <span class="hand" title="Highlight posts by this ID">${ data.id }</span>)</span>` : '' }
						${ data.country ? `<span title="${ data.country_name }" class="flag flag-${ data.country.toLowerCase() }"></span>` : '' }
						<br>
						<span class="subject">${ data.sub || '' }</span>
					</span>
					<span class="dateTime postNum" data-utc="${ data.time }">${ data.now } <a href="#p${ num }" title="Link to this post">No.</a><a href="javascript:quote('${ num }');" title="Reply to this post">${ num }</a></span>
				</div>
				<div class="postInfo desktop" id="pi${ num }">
					<input name="${ num }" value="delete" type="checkbox">
					<span class="subject">${ data.sub || '' }</span>
					<span class="nameBlock ${ capcodeClass }">
						${ data.email? `<a href="mailto:${ data.email.replace(/ /g, '%20') }" class="useremail">` : '' }
							<span class="name">${ name }</span>
							${ data.trip ? `<span class="postertrip">${ data.trip }</span>` : '' }
							${ capcodeText }
						${ data.email ? '</a>' : '' }
						${ capcodeImg }
						${ data.id && !data.capcode ? `<span class="posteruid id_${ data.id }">(ID: <span class="hand" title="Highlight posts by this ID">${ data.id }</span>)</span>` : '' }
						${ data.country ? `<span title="${ data.country_name }" class="flag flag-${ data.country.toLowerCase() }"></span>` : '' }
					</span>
					<span class="dateTime" data-utc="${ data.time }">${ data.now }</span>
					<span class="postNum desktop"><a href="#p${ num }" title="Link to this post">No.</a><a href="javascript:quote('${ num }');" title="Reply to this post">${ num }</a></span>
				</div>
				${ fileHTML }
				<blockquote class="postMessage" id="m${ num }"> ${ data.com || '' }</blockquote>
			</div>
		</div>`;
	}
	getPNum(i) {
		return this._posts[i + 1].no;
	}
	* bannedPostsData() {}
}
_4chanPostsBuilder._customSpoiler = new Map();

class DobrochanPostsBuilder {
	constructor(json, brd) {
		if(json.error) {
			throw new AjaxError(0, `API error: ${ json.error.message }`);
		}
		this._json = json.result;
		this._brd = brd;
		this._posts = json.result.threads[0].posts;
		this.length = this._posts.length - 1;
		this.postersCount = '';
	}
	get isClosed() {
		return !!this._json.threads[0].archived;
	}
	getOpMessage() {
		return $add(aib.fixHTML(`<div class="postbody"> ${ this._posts[0].message_html }</div>`));
	}
	getPostEl(i) {
		return $add(aib.fixHTML(this.getPostHTML(i))).firstChild.firstChild.lastElementChild;
	}
	getPostHTML(i) {
		const data = this._posts[i + 1];
		const num = data.display_id;
		const brd = this._brd;
		const multiFile = data.files.length > 1;

		let filesHTML = '';
		for(let file of data.files) {
			let fileName, fullFileName;
			let thumb = file.thumb;
			let thumb_w = 200;
			let thumb_h = 200;
			const ext = file.src.split('.').pop();
			if(brd === 'b' || brd === 'rf') {
				fileName = fullFileName = thumb.split('/').pop();
			} else {
				fileName = fullFileName = file.src.split('/').pop();
				if(multiFile && fileName.length > 20) {
					fileName = fileName.substr(0, 20 - ext.length) + '(...)' + ext;
				}
			}
			const max_rating = 'r15'; // FIXME: read from settings
			if(file.rating === 'r-18g' && max_rating !== 'r-18g') {
				thumb = "images/r-18g.png";
			} else if(file.rating === 'r-18' && (max_rating !== 'r-18g' || max_rating !== 'r-18')) {
				thumb = "images/r-18.png";
			} else if(file.rating === 'r-15' && max_rating === 'sfw') {
				thumb = "images/r-15.png";
			} else if(file.rating === 'illegal') {
				thumb = "images/illegal.png";
			} else {
				thumb_w = file.thumb_width;
				thumb_h = file.thumb_height;
			}
			let fileInfo = `<div class="fileinfo${ multiFile ? ' limited' : '' }">Файл:
				<a href="/${ file.src }" title="${ fullFileName }" target="_blank">${ fileName }</a><br>
				<em>${ ext }, ${ prettifySize(file.size) }, ${
					file.metadata.width }x${ file.metadata.height
				}</em>${ multiFile ? '' : ' - Нажмите на картинку для увеличения' }<br>
				<a class="edit_ icon" href="/utils/image/edit/${ file.file_id }/${ num }">
					<img title="edit" alt="edit" src="/images/blank.png">
				</a>
			</div>`;
			filesHTML += `${ multiFile ? '' : fileInfo }
			<div id="file_${ num }_${ file.file_id }" class="file">${ multiFile ? fileInfo : '' }
				<a href="/${ file.src }" target="_blank">
					<img class="thumb" src="/${ thumb }" width="${ thumb_w }" height="${ thumb_h }">
				</a>
			</div>`;
		}

		const date = data.date.replace(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/,
			(_, y, mo, d, h, m, s) => {
				let dt = new Date(y, +mo - 1, d, h, m, s);
				return `${ pad2(dt.getDate()) } ${ Lng.fullMonth[1][dt.getMonth()]} ${ dt.getFullYear()
					} (${ Lng.week[1][dt.getDay()] }) ${ pad2(dt.getHours()) }:${ pad2(dt.getMinutes()) }`;
			});

		const isOp = i === -1;
		return `${ isOp ? `<div id="post_${ num }" class="oppost post">` :
		`<table id="post_${ num }" class="replypost post"><tbody><tr>
			<td class="doubledash">&gt;&gt;</td>
			<td class="reply" id="reply${ num }">` }
				<a name="i${ num }"></a>
				<label>
					<input name="${ num }" value="${ data.thread_id
						}" class="delete_checkbox" id="delbox_${ num }" type="checkbox">
					${ data.subject ? `<span class="replytitle">${ data.subject }</span>` : '' }
					<span class="postername">${ data.name || 'Анонимус' }</span> ${ date }
				</label>
				<span class="reflink">
					<a href="/${ brd }/res/${ data.thread_id }.xhtml#i${ num }"> No.${ num }</a>
				</span><br>
				${ filesHTML }
				${ multiFile ? '<div style="clear: both;"></div>' : '' }
				<div class="postbody"> ${ data.message_html }</div>
			${ isOp ? '</div>' : '</td></tr></tbody></table>' }`;
	}
	getPNum(i) {
		return this._posts[i + 1].display_id;
	}
	* bannedPostsData() {}
}

class MakabaPostsBuilder {
	constructor(json, brd) {
		if(json.Error) {
			throw new AjaxError(0, `API error: ${ json.Error } (${ json.Code })`);
		}
		this._json = json;
		this._brd = brd;
		this._posts = json.threads[0].posts;
		this.length = json.posts_count;
		this.postersCount = json.unique_posters;
	}
	get isClosed() {
		return this._json.is_closed;
	}
	getOpMessage() {
		return $add(aib.fixHTML(this._getPostMsg(this._posts[0])));
	}
	getPostEl(i) {
		return $add(aib.fixHTML(this.getPostHTML(i))).firstElementChild;
	}
	getPostHTML(i) {
		const data = this._posts[i + 1];
		const num = data.num;
		const brd = this._brd;

		const _switch = (val, obj) => val in obj ? obj[val] : obj['@@default'];

		let filesHTML = '';
		if(data.files && data.files.length !== 0) {
			filesHTML = `<div class="images ${ data.files.length === 1 ? 'images-single' : 'images-multi' }">`;
			for(let file of data.files) {
				const imgId = num + '-' + file.md5;
				const fullName = file.fullname || file.name;
				const dispName = file.displayname || file.name;
				const isWebm = fullName.substr(-5) === '.webm';
				filesHTML += `<figure class="image">
					<figcaption class="file-attr">
						<a id="title-${ imgId }" class="desktop" target="_blank" href="${ file.path }"${
							dispName === fullName ? '' : ` title="${ fullName }"` }>${ dispName }</a>
						<span class="filesize">(${ file.size }Кб, ${ file.width }x${ file.height }${
							isWebm ? ', ' + file.duration : '' })</span>
					</figcaption>
					<div id="exlink-${ imgId }" class="image-link">
						<a href="${ file.path }">
							<img src="${ file.thumbnail }" width="${ file.tn_width }" height="${ file.tn_height
								}" alt="${ file.size }" class="img preview${ isWebm ? ' webm-file' : '' }">
						</a>
					</div>
				</figure>`;
			}
			filesHTML += '</div>';
		} else if(data.video) {
			filesHTML = `<div class="images">
				<div style="float: left; margin: 5px; margin-right:10px">
					${ post.video }
				</div>
			</div>`;
		}

		return `<div id="post-${ num }" class="post-wrapper">
			<div class="post ${ i === -1 ? 'oppost' : 'reply' }" id="post-body-${ num }" data-num="${ num }">
				<div id="post-details-${ num }" class="post-details">
					<input type="checkbox" name="delete" value="${ num }">
					${ !data.subject ? '' :
						`<span class="post-title">${ data.subject + ( data.tags ? ' /' + data.tags + '/' : '') }</span>` }
					${ data.email ?
						`<a href="${ data.email }" class="post-email">${ data.name }</a>` :
						`<span class="ananimas">${ data.name }</span>` }
					${ data.icon ? `<span class="post-icon">${ data.icon }</span>` : '' }
					<span class="${ !data.trip ? '' : _switch(data.trip, {
					   '!!%adm%!!':        'adm">## Abu ##',
					   '!!%mod%!!':        'mod">## Mod ##',
					   '!!%Inquisitor%!!': 'inquisitor">## Applejack ##',
					   '!!%coder%!!':      'mod">## Кодер ##',
					   '@@default':        'postertrip">' + data.trip
					}) }<\/span>
					${ data.op === 1 ? '<span class="ophui"># OP</span>&nbsp;' : '' }
					<span class="posttime-reflink">
						<span class="posttime">${ data.date }&nbsp;</span>
						<span class="reflink">
							<a href="/${ brd }/res/${ parseInt(data.parent) || num }.html#${ num }">№</a><a href="/${ brd }/res/${ parseInt(data.parent) || num }.html#${ num }" class="postbtn-reply-href" name="${ num }">${ num }</a>
						</span>
					</span>
					${ this._brd === 'po' ?
						`<div id="like-div${ num }" class="like-div">
							<span class="like-icon"><i class="fa fa-bolt"></i></span>
							<span class="like-caption">Двачую</span>
							<span id="like-count${ num }" class="like-count">${ data.likes || '' }</span>
						</div>
						<div id="dislike-div${ num }" class="dislike-div">
							<span class="dislike-icon"><i class="fa fa-thumbs-down"></i></span>
							<span class="dislike-caption">RRRAGE!</span>
							<span id="dislike-count${ num }" class="dislike-count">${ data.dislikes || '' }</span>
						</div>` : '' }
				</div>
				${ filesHTML }
				${ this._getPostMsg(data) }
			</div>
		</div>`;
	}
	getPNum(i) {
		return this._posts[i + 1].num;
	}
	* bannedPostsData() {
		for(let post of this._posts) {
			switch(post.banned) {
			case 1:
				yield [1, post.num, $add('<span class="pomyanem">(Автор этого поста был забанен. Помянем.)</span>')];
				break;
			case 2:
				yield [2, post.num, $add('<span class="pomyanem">(Автор этого поста был предупрежден.)</span>')];
				break;
			}
		}
	}

	_getPostMsg(data) {
		const _switch = (val, obj) => val in obj ? obj[val] : obj['@@default'];
		const comment = data.comment.replace(/<script /ig, '<!--<textarea ')
			.replace(/<\/script>/ig, '</textarea>-->');
		return `<blockquote id="m${ data.num }" class="post-message">
			${ comment }
			${ _switch(data.banned, {
			   1:           '<br><span class="pomyanem">(Автор этого поста был забанен. Помянем.)</span>',
			   2:           '<br><span class="pomyanem">(Автор этого поста был предупрежден.)</span>',
			   '@@default': ''
			}) }
		</blockquote>`;
	}
}

class _0chanPostsBuilder {
	constructor(json, brd) {
		if(json.error) {
			throw new AjaxError(0, `API error: ${ json.message }`);
		}
		this._json = json;
		this._posts = json.posts;
		this.length = json.posts.length - 1;
		this.postersCount = '';
	}
	getOpMessage() {
		return $add(aib.fixHTML(`<div class="post-body-message"><div> ${ this._posts[0].message }</div></div>`));
	}
	getPostEl(i) {
		return $add(aib.fixHTML(this.getPostHTML(i)));
	}
	getPostHTML(i) {
		const data = this._posts[i + 1];
		const num = data.id;
		const brd = data.boardDir;
		const parId = data.parentId;
		const isOp = i === -1;
		let filesHTML = '';
		if(data.attachments.length) {
			filesHTML += '<div class="post-attachments">';
			for(let file of data.attachments) {
				const id = file.id;
				const img = file.images;
				const orig = img.original;
				const thumb200 = img.thumb_200px;
				const thumb400 = img.thumb_400px;
				filesHTML += `<figure class="post-img"><span>
					<figcaption>
						<span class="pull-left">${ orig.width }x${ orig.height }, ${ orig.size_kb }Кб</span>
					</figcaption>
					<a href="${ orig.url }" target="_blank"><img src="${ thumb200.url
						}" srcset="${ thumb400.url } 2x" class="post-img-thumbnail" style="width: ${
						thumb200.width }px; height: ${ thumb200.height }px;"></a>
				</span></figure>`;
			}
			filesHTML += '</div>';
		}

		const d = new Date(data.date * 1e3);
		const date = `${ d.getFullYear() }-${ pad2(d.getMonth() + 1) }-${ pad2(d.getDate()) } ${
			pad2(d.getHours()) }:${ pad2(d.getMinutes()) }:${ pad2(d.getSeconds()) }`;
		return `<div><div class="block post${ isOp ? ' post-op' : '' }">
			<div class="post-header">
				<a name="${ num }"></a>
				<span class="post-id">
					<a href="/${ brd }" class="router-link-active">/${ brd }/</a>
					${ isOp ? `<span>— ${ this._json.thread.board.name } —</span>` : '' }
					<a href="/${ brd }/${ data.threadId + (isOp ? '' : '#' + num) }">#${ num }</a>
				</span>
				<span class="pull-right">
					<span class="post-thread-options"></span>
					<span class="post-date">${ date }</span>
				</span>
			</div>
			<div class="post-body${ data.attachments.length > 1 ? '' : ' post-inline-attachment' }">
				${ filesHTML }
				<div class="post-body-message">
					${ parId === this._json.posts[0].id ? '' : `<div class="post-parent"><a data-post="${ parId }" href="/${ brd }/${ data.threadId }#${ parId}">&gt;&gt;${ parId }</a></div>` }
					<div> ${ data.messageHtml || '' }</div>
				</div>
			</div>
			<div class="post-footer"></div>
		</div></div>`;
	}
	getPNum(i) {
		return +this._posts[i + 1].id; // Must return a Number, not a String!
	}
}

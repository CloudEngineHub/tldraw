import { TLAudioShape, TLVideoShape } from '@tldraw/editor'
import { Children, ReactElement, cloneElement, useCallback, useEffect, useRef, useState } from 'react'
import { TldrawUiButton } from '../../ui/components/primitives/Button/TldrawUiButton'
import { TldrawUiButtonIcon } from '../../ui/components/primitives/Button/TldrawUiButtonIcon'
import { TldrawUiSlider } from '../../ui/components/primitives/TldrawUiSlider'
import { useTranslation } from '../../ui/hooks/useTranslation/useTranslation'
import { ITimingObject, TimingObject } from 'timing-object';
import { setTimingsrc } from 'timingsrc';
import { TimingProvider } from './TimingProvider'

type MediaElement = HTMLAudioElement | HTMLVideoElement

export function MediaControls({
	children,
	shape,
	isMutedInitially,
	widthScaled,
}: {
	children: ReactElement
	shape: TLVideoShape | TLAudioShape
	widthScaled: number
	isMutedInitially?: boolean
}) {
	const [isPlaying, setIsPlaying] = useState(false)
	const [isTimingObjectReady, setIsTimingObjectReady] = useState(false)
	const [isMuted, setIsMuted] = useState(!!isMutedInitially)
	const [newSeekTime, setNewSeekTime] = useState<number | null>(null)
	const [currentTime, setCurrentTime] = useState(0)
	const msg = useTranslation()
	const rMedia = useRef<MediaElement>(null!)
	const timingObject = useRef<ITimingObject>();

	useEffect(() => {
		if (!timingObject.current) {
			timingObject.current = new TimingObject(new TimingProvider('ws://localhost:2276'))
		}
	
		if (!rMedia.current || !timingObject.current) return

		timingObject.current.addEventListener('readystatechange', () => {
			if (!timingObject.current) return

			console.log(timingObject.current.readyState)
			if (timingObject.current.readyState === 'open') {
				setTimingsrc(rMedia.current, timingObject.current);
				setIsTimingObjectReady(true)
			}
		})
	}, [])

	const handleOnPlay = () => {
		setIsPlaying(true)
		isTimingObjectReady && timingObject.current?.update({ velocity: 1 });
	}
	const handleOnPause = () => {
		setIsPlaying(false)
		isTimingObjectReady && timingObject.current?.update({ velocity: 0 });
	}
	const handleSetCurrentTime = (e: React.SyntheticEvent<MediaElement>) => {
		const media = e.currentTarget
		if (!media) return

		setCurrentTime(media.currentTime)
	}
	const handleSeek = (time: number) => {
		setNewSeekTime(time)
	}
	const handleSliderPointerUp = () => {
		if (!rMedia.current) return
		rMedia.current.currentTime = newSeekTime ?? 0
		setCurrentTime(newSeekTime ?? 0)
		setNewSeekTime(null)
	}

	const handlePlayControl = useCallback(() => {
		if (isPlaying) {
			rMedia.current?.pause()
		} else {
			rMedia.current?.play()
		}
	}, [isPlaying])
	const handleVolumeControl = () => {
		rMedia.current.muted = !isMuted
		setIsMuted(!isMuted)
	}

	const childElement = Children.only(children)
	const mediaElement = cloneElement(childElement, {
		ref: rMedia,
		onPlay: handleOnPlay,
		onPause: handleOnPause,
		onTimeUpdate: handleSetCurrentTime,
	})

	return (
		<>
			{mediaElement}
			{/* We stop propagation here because otherwise onPointerDown in useCanvasEvents screws things up. */}
			<div className="tl-media-controls" onPointerDown={(e) => e.stopPropagation()}>
				<TldrawUiButton
					type="icon"
					title={msg(isPlaying ? 'media.pause' : 'media.play')}
					onClick={handlePlayControl}
				>
					<TldrawUiButtonIcon icon={isPlaying ? 'pause' : 'play'} />
				</TldrawUiButton>
				{rMedia.current?.duration && widthScaled > 0.5 ? (
					<div className="tl-media-time">
						<span className="tl-media-time-current">{`${secondsToTime(newSeekTime ?? currentTime)}`}</span>
						<span>{' / '}</span>
						<span className="tl-media-time-total">{secondsToTime(rMedia.current.duration)}</span>
					</div>
				) : null}
				{widthScaled > 0.75 && (
					<TldrawUiSlider
						// XXX(mime): the slider messes up when it's resized. We set a key here to force a re-render.
						key={`slider-${shape.props.w}`}
						value={newSeekTime ?? currentTime}
						label={secondsToTime(newSeekTime ?? currentTime)}
						onValueChange={handleSeek}
						onPointerUp={handleSliderPointerUp}
						steps={rMedia.current?.duration || 0}
						title={msg('media.seek')}
					/>
				)}
				<TldrawUiButton
					type="icon"
					title={msg(isMuted ? 'media.unmute' : 'media.mute')}
					onMouseDown={handleVolumeControl}
				>
					<TldrawUiButtonIcon icon={isMuted ? 'speaker-off' : 'speaker-loud'} />
				</TldrawUiButton>
			</div>
		</>
	)
}

function secondsToTime(seconds: number) {
	const minutes = Math.floor(seconds / 60)
	const remainingSeconds = Math.floor(seconds % 60)
	return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

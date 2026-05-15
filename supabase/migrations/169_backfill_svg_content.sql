-- ============================================================================
-- Migration 169: Backfill svg_templates.svg_content from static files (Phase 172.1)
--
-- Addresses UAT regression surfaced in Phase 172 live E2E: all 24 active
-- svg_templates rows have svg_content = NULL, so the new SVG Apply RPC
-- (migration 170) has no server-side fallback when p_customized_svg is null.
--
-- Scope (per 172.1-CONTEXT.md D-06/D-07):
--   * 24 rows in svg_templates (12 seeded by 097 with slug=NULL, 12 seeded
--     by 167 with slug bearing). Both sets reference the same 12 unique
--     static files under public/templates/svg/**.
--   * UPDATE matches by svg_url (not slug) so it covers both row sets.
--   * Idempotent: WHERE svg_content IS NULL guard (D-06).
--
-- Runs BEFORE migration 170 (the new RPC) so the RPC never observes a row
-- where both p_customized_svg and svg_content are null (D-14).
--
-- Wrapping in TRIM(BOTH ...) strips leading/trailing whitespace that
-- dollar-quoted delimiter placement would otherwise introduce — the
-- downstream SVG preview validator requires svg_content to start with '<'.
--
-- No DOWN migration (matches 080/110/167/168 convention).
-- ============================================================================


-- restaurant-menu: backfill from public/templates/svg/restaurant-menu/menu-design.svg
UPDATE svg_templates
SET svg_content = TRIM(BOTH E' \t\r\n' FROM $svg$<?xml version="1.0" encoding="utf-8"?>
<!-- Generator: Adobe Adobe Illustrator 29.2.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->
<svg version="1.1" id="Print" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
	 viewBox="0 0 841.89 595.28" style="enable-background:new 0 0 841.89 595.28;" xml:space="preserve">
<style type="text/css">
	.st0{fill:none;}
	.st1{fill:#FFFFFF;}
	.st2{fill:#C8C8C8;}
	.st3{fill:#ECE2D6;}
	.st4{clip-path:url(#SVGID_00000059988494159615919460000013715497614410808482_);}
	.st5{opacity:0.3;fill:#EEAB37;}
	.st6{clip-path:url(#SVGID_00000059988494159615919460000013715497614410808482_);fill:none;stroke:#FFFFFF;stroke-miterlimit:10;}
	.st7{opacity:0.3;clip-path:url(#SVGID_00000059988494159615919460000013715497614410808482_);fill:#EEAB37;}
	.st8{clip-path:url(#SVGID_00000059988494159615919460000013715497614410808482_);fill:none;stroke:#FBF8F7;stroke-miterlimit:10;}
	.st9{fill:none;stroke:#333333;stroke-width:0.8637;stroke-miterlimit:10;}
	.st10{fill:none;stroke:#333333;stroke-width:0.8926;stroke-miterlimit:10;}
	.st11{fill:none;stroke:#333333;stroke-width:0.8575;stroke-miterlimit:10;}
	.st12{fill:#E98813;}
	.st13{font-family:'Poppins-SemiBold';}
	.st14{font-size:20px;}
	.st15{fill:#333333;}
	.st16{font-family:'Poppins-Regular';}
	.st17{font-size:11px;}
	.st18{fill:none;stroke:#333333;stroke-width:1.7102;stroke-linecap:round;stroke-linejoin:round;}
	.st19{fill:none;stroke:#333333;stroke-width:1.7102;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:0,5.9276;}
	.st20{font-family:'Poppins-Medium';}
	.st21{fill:#666666;}
	.st22{font-family:'Poppins-ExtraLightItalic';}
	.st23{font-size:10px;}
	.st24{fill:none;stroke:#333333;stroke-width:1.7102;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:0,6.0889;}
	.st25{fill:none;stroke:#333333;stroke-width:1.7102;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:0,6.0702;}
	.st26{font-family:'Poppins-Light';}
	.st27{fill:#EEAB37;}
	.st28{font-family:'FrederickatheGreat-Regular';}
	.st29{font-size:57.6802px;}
	.st30{font-size:27.0916px;}
	.st31{fill:none;stroke:#333333;stroke-width:1.7102;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:0,5.8542;}
	.st32{fill:none;stroke:#333333;stroke-width:1.7102;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:0,6.0087;}
	.st33{fill:none;stroke:#333333;stroke-width:1.7102;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:0,5.9352;}
	.st34{fill:none;stroke:#333333;stroke-width:1.7102;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:0,5.9461;}
	.st35{fill:none;stroke:#333333;stroke-width:1.7102;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:0,5.9311;}
	.st36{fill:none;stroke:#333333;stroke-width:1.7102;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:0,5.9259;}
	.st37{fill:none;stroke:#333333;stroke-width:1.7102;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:0,5.9828;}
	.st38{fill:none;stroke:#333333;stroke-width:1.7102;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:0,6.1361;}
	
		.st39{fill:none;stroke:#333333;stroke-width:1.7102;stroke-linecap:round;stroke-linejoin:round;stroke-miterlimit:10;stroke-dasharray:0,5.9855;}
	.st40{font-size:13.2912px;}
	.st41{font-size:13.564px;}
	.st42{font-size:20.899px;}
</style>
<pattern  width="30" height="30" patternUnits="userSpaceOnUse" id="New_Pattern_Swatch_4" viewBox="0 -30 30 30" style="overflow:visible;">
	<g>
		<rect y="-30" class="st0" width="30" height="30"/>
		<rect y="-30" class="st1" width="15" height="15"/>
		<rect x="15" y="-30" class="st2" width="15" height="15"/>
		<rect y="-15" class="st2" width="15" height="15"/>
		<rect x="15" y="-15" class="st1" width="15" height="15"/>
	</g>
</pattern>
<g>
	<rect x="-8.5" y="-8.5" class="st3" width="858.9" height="612.28"/>
	<g>
		<defs>
			<rect id="SVGID_1_" x="-8.5" y="-8.5" width="858.9" height="612.28"/>
		</defs>
		<clipPath id="SVGID_00000023252426943758541970000016936034037649522094_">
			<use xlink:href="#SVGID_1_"  style="overflow:visible;"/>
		</clipPath>
		<g style="clip-path:url(#SVGID_00000023252426943758541970000016936034037649522094_);">
			<path class="st5" d="M830.93,444.74c-7.51,3.71-14.82,8.04-22.82,10.63c-18.38,5.96-37.62,1.29-55.83-4.04
				c-54.61-16-199.94-27-235.75,152.45h333.87V438.14C843.58,438.84,837.01,441.75,830.93,444.74z"/>
			<path class="st5" d="M604.67,47.83c7.67,36.5-9.12,53-3.83,80.17c7.87,40.44,65.09,40.44,81.61,43.62
				c16.68,3.21,32.05,10.55,48.8,13.38c66.08,11.15,110-12.86,119.14-24.25V-8.5H590.67C582,23.67,601.18,31.25,604.67,47.83z"/>
			<path class="st5" d="M332,498.5c-22.08-6.92-45.92-7.63-68.51-2.08c-21.35,5.25-42.46,16.77-59.16,30.58
				c-11.93,9.87-20.11,22.67-33.43,30.67c-13,7.81-28.6,10.46-43.54,8.12c-39.89-6.26-63.63-43.51-92.85-67.32
				C21.94,488.23,7.89,480.04-8.5,478.23v125.56h439C430.13,599.19,404.86,521.33,332,498.5z"/>
		</g>
		
			<path style="clip-path:url(#SVGID_00000023252426943758541970000016936034037649522094_);fill:none;stroke:#FFFFFF;stroke-miterlimit:10;" d="
			M538.58,611.05c-0.69-34.58,20.56-68.63,51.93-83.2c35.86-16.66,78.2-8.18,116.78-16.84c32.87-7.38,62.63-27.78,81.36-55.78
			c10.18-15.22,17.22-32.54,28.84-46.7c11.62-14.16,29.94-25.08,47.75-20.8"/>
		
			<path style="clip-path:url(#SVGID_00000023252426943758541970000016936034037649522094_);fill:none;stroke:#FFFFFF;stroke-miterlimit:10;" d="
			M506.49-14.86c-7.11,29.85,23.55,48.38,48.06,53.6c16.94,3.61,35.52,3.46,47.65,17.74c10.71,12.61,11.59,29.17,17.08,44.04
			c23.14,62.7,86.31,104.82,152.95,103.75c33.4-0.54,66.32-10.24,94.44-28.34c2.93-1.89,5.81-3.86,8.63-5.92"/>
		
			<path style="clip-path:url(#SVGID_00000023252426943758541970000016936034037649522094_);fill:none;stroke:#FFFFFF;stroke-miterlimit:10;" d="
			M-16.45,505.33c8.82-8.65,23.39-9.15,34.62-4.01c25.1,11.49,32.75,39.38,51.23,57.43c20.4,19.92,43.6,25.83,71.1,20.25
			c32-6.5,36.17-32,80.17-56c47.94-26.15,116.52-5.8,145.06,12.79c33.69,21.96,49.08,59.87,49.77,70.71"/>
		<path style="opacity:0.3;clip-path:url(#SVGID_00000023252426943758541970000016936034037649522094_);fill:#EEAB37;" d="
			M74.75,250.5C123.5,228,138.45,169.03,143,161c17-30,72.6-35.05,87.4-40.08C281,103.75,304,45.5,291.18-8.5H-8.5v258.13
			C5,257.75,50.82,261.55,74.75,250.5z"/>
		<g style="clip-path:url(#SVGID_00000023252426943758541970000016936034037649522094_);">
			<defs>
				<path id="SVGID_00000067943453937290271520000002473099759104309180_" d="M179.41-18.29c0,0,10.94,4.13,12.92,5.97
					c1.98,1.83-10.32,38.63-10.32,38.63S208.63,35.4,209.5,38c0.87,2.6-9.45,27.88-12.15,28.65c-1.46,0.42-7.96-3.27-14.68-6.75
					c-5.73-2.97-11.24-5.03-11.24-5.03l-18.23,38.06l-32.96-11.57c0,0,13.11,16.77,14.46,20.82c1.35,4.05,2.31,16-4.82,25.83
					c-7.13,9.83-85.01,73.06-88.29,74.8c-3.28,1.73-20.05,6.55-34.51-5.2c-14.46-11.76-29.3-31.23-29.3-31.23
					s-6.75-13.69-15.61-16.96c-4.05-4.63-16.77-17.73-16.77-17.73V-18.06C-54.62-18.06,179.41-18.87,179.41-18.29z"/>
			</defs>
			
				<use xlink:href="#SVGID_00000067943453937290271520000002473099759104309180_"  style="overflow:visible;fill:url(#New_Pattern_Swatch_4);"/>
			<clipPath id="SVGID_00000055675752510791676620000002129420676030366372_">
				<use xlink:href="#SVGID_00000067943453937290271520000002473099759104309180_"  style="overflow:visible;"/>
			</clipPath>
		</g>
		<g style="clip-path:url(#SVGID_00000023252426943758541970000016936034037649522094_);">
			<defs>
				<circle id="SVGID_00000080170356456759332850000010240235425186257560_" cx="286.33" cy="618.83" r="115.5"/>
			</defs>
			
				<use xlink:href="#SVGID_00000080170356456759332850000010240235425186257560_"  style="overflow:visible;fill:url(#New_Pattern_Swatch_4);"/>
			<clipPath id="SVGID_00000003071384671130528140000002402599861376399510_">
				<use xlink:href="#SVGID_00000080170356456759332850000010240235425186257560_"  style="overflow:visible;"/>
			</clipPath>
		</g>
		<g style="clip-path:url(#SVGID_00000023252426943758541970000016936034037649522094_);">
			<defs>
				<circle id="SVGID_00000130647233499231035150000002725009541442302639_" cx="769.33" cy="21.17" r="151.17"/>
			</defs>
			
				<use xlink:href="#SVGID_00000130647233499231035150000002725009541442302639_"  style="overflow:visible;fill:url(#New_Pattern_Swatch_4);"/>
			<clipPath id="SVGID_00000008134022836825625150000004197220194993930676_">
				<use xlink:href="#SVGID_00000130647233499231035150000002725009541442302639_"  style="overflow:visible;"/>
			</clipPath>
		</g>
		<g style="clip-path:url(#SVGID_00000023252426943758541970000016936034037649522094_);">
			<defs>
				<path id="SVGID_00000134209785572099321810000007563938860839423932_" d="M859.22,467.18c-2.83-2.46-14.08-16.58-39.62-3.17
					c-19.39,10.18-29.38,8.22-33.06,6.69c-0.27-0.13-0.55-0.25-0.82-0.38c-0.6-0.31-0.88-0.54-0.88-0.54l0.18,0.22
					c-41.87-18.87-92.38-15.46-132.28,13.35c-42.27,30.52-61.23,81.3-53.2,129.46c-0.29,1.33-1.77,7.21-6.06,12.87
					c-4.89,6.43-20.22,18.57-21.35,31.3c-1.13,12.73,10.09,30.84,20.93,43.66c10.84,12.82,16.11,23.05,33.78,19.29
					c17.34-3.69,26.29-14.06,39.97-12.57c43.44,23.67,98.43,21.98,141.22-8.91c44.01-31.77,62.76-85.53,52.07-135.41l0.07,0.09
					c0,0,3.4-4.83,13.39-16.29c18.39-19.63,15.19-25.52,14.14-36.15C886.66,500.05,862.05,469.63,859.22,467.18z M640.01,706.06
					c-14.9,10.36-22.07,0.97-25.09-0.28c-3.02-1.26-24.83-32.37-29.04-39.13c-4.21-6.75-2.33-19.37,5.56-25.85
					c7.89-6.49,15.37,2.4,15.37,2.4s8.57,16.45,12.51,22.47c3.95,6.02,14.64,17.89,21.63,24.09
					C646.88,696.79,643.06,702.86,640.01,706.06z M876.72,517.82c0.68,3.88,0.62,14.24-4.91,18.51c-5.53,4.25-12.01,8.67-17.77,2.51
					c-5.77-6.16-8.28-18.25-18.08-30.36c-9.8-12.12-18.81-19.64-19.28-21.02c0,0-3.57-7.88,0.64-11.58
					c4.21-3.7,15.37-9.51,25.53-3.87C853,477.63,876.04,513.94,876.72,517.82z"/>
			</defs>
			
				<use xlink:href="#SVGID_00000134209785572099321810000007563938860839423932_"  style="overflow:visible;fill:url(#New_Pattern_Swatch_4);"/>
			<clipPath id="SVGID_00000140012373405932730560000000370311619317438881_">
				<use xlink:href="#SVGID_00000134209785572099321810000007563938860839423932_"  style="overflow:visible;"/>
			</clipPath>
		</g>
		
			<path style="clip-path:url(#SVGID_00000023252426943758541970000016936034037649522094_);fill:none;stroke:#FBF8F7;stroke-miterlimit:10;" d="
			M271.8-11.03c-0.34,31.08-15.81,60.39-40.2,79.33c-18.54,14.4-41.57,21.88-59.25,37.51c-10.51,9.29-18.7,21.08-23.93,34.09
			c-5.89,14.66-6.98,30.89-10.94,46.1c-7.43,28.48-30.48,53.61-59.25,59.05c-36.73,6.94-67.16-2.39-93.05-22.19"/>
	</g>
	<g>
		<g>
			<line class="st9" x1="85.67" y1="416.83" x2="255.67" y2="416.83"/>
			<line class="st10" x1="380.75" y1="292.33" x2="554.25" y2="292.33"/>
			<line class="st11" x1="636.94" y1="356.83" x2="797.06" y2="356.83"/>
		</g>
		<g>
			<g>
				<text transform="matrix(1 0 0 1 47.23 264.0693)" class="st12 st13 st14">STARTERS</text>
				<g>
					<text transform="matrix(1 0 0 1 52.125 289.2505)" class="st15 st16 st17">TOMATO SOUP</text>
					<g>
						<g>
							<line class="st18" x1="127.35" y1="288.83" x2="127.35" y2="288.83"/>
							<line class="st19" x1="133.28" y1="288.83" x2="248.87" y2="288.83"/>
							<line class="st18" x1="251.83" y1="288.83" x2="251.83" y2="288.83"/>
						</g>
					</g>
					<g>
						<text transform="matrix(1 0 0 1 260.502 289.5005)" class="st15 st20 st17">$ 10.00</text>
					</g>
					<rect x="49.38" y="298.17" class="st0" width="243.79" height="22.67"/>
					<text transform="matrix(1 0 0 1 49.375 305.5659)"><tspan x="0" y="0" class="st21 st22 st23">Lorem ipsum dolor sit amet, consectetur adipis </tspan><tspan x="0" y="12" class="st21 st22 st23">cing elit mauris. </tspan></text>
				</g>
				<g>
					<text transform="matrix(1 0 0 1 52.125 337.917)" class="st15 st16 st17">CHICKEN SOUP</text>
					<g>
						<g>
							<line class="st18" x1="127.35" y1="337.5" x2="127.35" y2="337.5"/>
							<line class="st19" x1="133.28" y1="337.5" x2="248.87" y2="337.5"/>
							<line class="st18" x1="251.83" y1="337.5" x2="251.83" y2="337.5"/>
						</g>
					</g>
					<g>
						<text transform="matrix(1 0 0 1 260.502 338.167)" class="st15 st20 st17">$ 10.00</text>
					</g>
					<g>
						<rect x="49.38" y="346.83" class="st0" width="242.79" height="22.67"/>
						<text transform="matrix(1 0 0 1 49.375 354.2324)" class="st21 st22 st23">Lorem ipsum dolor sit amet, consectetur.</text>
					</g>
				</g>
				<g>
					<text transform="matrix(1 0 0 1 52.125 374.2505)" class="st15 st16 st17">CRISPY CORN</text>
					<g>
						<g>
							<line class="st18" x1="127.35" y1="373.83" x2="127.35" y2="373.83"/>
							<line class="st19" x1="133.28" y1="373.83" x2="248.87" y2="373.83"/>
							<line class="st18" x1="251.83" y1="373.83" x2="251.83" y2="373.83"/>
						</g>
					</g>
					<g>
						<text transform="matrix(1 0 0 1 260.502 374.5005)" class="st15 st20 st17">$ 10.00</text>
					</g>
					<g>
						<rect x="49.38" y="383.17" class="st0" width="243.46" height="22.67"/>
						<text transform="matrix(1 0 0 1 49.375 390.5659)"><tspan x="0" y="0" class="st21 st22 st23">Lorem ipsum dolor sit amet, consectetur adipis </tspan><tspan x="0" y="12" class="st21 st22 st23">cing elit mauris. </tspan></text>
					</g>
				</g>
			</g>
			<g>
				<g>
					<text transform="matrix(1 0 0 1 52.125 462.5835)" class="st15 st16 st17">GUACAMOLE SALAD</text>
					<g>
						<g>
							<line class="st18" x1="160.5" y1="462.17" x2="160.5" y2="462.17"/>
							<line class="st24" x1="166.59" y1="462.17" x2="248.79" y2="462.17"/>
							<line class="st18" x1="251.83" y1="462.17" x2="251.83" y2="462.17"/>
						</g>
					</g>
					<g>
						<text transform="matrix(1 0 0 1 260.502 463.667)" class="st15 st20 st17">$ 10.00</text>
					</g>
					<g>
						<rect x="49.38" y="471.5" class="st0" width="244.46" height="15.33"/>
						<text transform="matrix(1 0 0 1 49.375 478.9009)" class="st21 st22 st23">Lorem ipsum dolor sit amet, consectetur adipis </text>
					</g>
				</g>
				<g>
					<text transform="matrix(1 0 0 1 52.125 496.917)" class="st15 st16 st17">CHICKEN SALAD</text>
					<g>
						<g>
							<line class="st18" x1="136.5" y1="496.5" x2="136.5" y2="496.5"/>
							<line class="st25" x1="142.57" y1="496.5" x2="248.8" y2="496.5"/>
							<line class="st18" x1="251.83" y1="496.5" x2="251.83" y2="496.5"/>
						</g>
					</g>
					<g>
						<text transform="matrix(1 0 0 1 260.502 497.0005)" class="st15 st20 st17">$ 10.00</text>
					</g>
					<g>
						<rect x="49.38" y="505.83" class="st0" width="188.38" height="31"/>
						<text transform="matrix(1 0 0 1 49.375 513.2344)"><tspan x="0" y="0" class="st21 st22 st23">Lorem ipsum dolor sit amet, conse </tspan><tspan x="0" y="12" class="st21 st22 st23">ctetur adipiscing elit.</tspan></text>
					</g>
				</g>
				<text transform="matrix(1 0 0 1 52.6665 442.3335)" class="st12 st13 st14">SALADS</text>
			</g>
			<g>
				<rect x="47.75" y="199.83" class="st0" width="254" height="38.5"/>
				<text transform="matrix(1 0 0 1 47.8521 207.2334)"><tspan x="0" y="0" class="st15 st26 st23">Lorem ipsum dolor sit amet, consectetur adipiscing </tspan><tspan x="3.75" y="12" class="st15 st26 st23">elit. Mauris interdum est risus, convallis accumsan </tspan><tspan x="70.72" y="24" class="st15 st26 st23">leo inter dum placerat. </tspan></text>
				<polygon class="st27" points="311.08,179.65 103.92,179.65 116.44,164.47 103.92,149.68 311.08,149.68 				"/>
				<g>
					<text transform="matrix(1 0 0 1 129.9229 135.2495)" class="st12 st28 st29">MENU</text>
				</g>
				<text transform="matrix(1 0 0 1 123.8467 174.8262)" class="st15 st20 st30">RESTAURANT</text>
			</g>
			<g>
				<text transform="matrix(1 0 0 1 345.25 332.4165)" class="st12 st13 st14">DESSERTS</text>
				<g>
					<g>
						<text transform="matrix(1 0 0 1 346 356.542)" class="st15 st16 st17">FRUIT AND CREAM</text>
					</g>
					<g>
						<g>
							<line class="st18" x1="445.83" y1="356.12" x2="445.83" y2="356.12"/>
							<line class="st31" x1="451.69" y1="356.12" x2="548.28" y2="356.12"/>
							<line class="st18" x1="551.21" y1="356.12" x2="551.21" y2="356.12"/>
						</g>
					</g>
					<g>
						<text transform="matrix(1 0 0 1 556.3125 357.792)" class="st15 st20 st17">$ 5.00</text>
					</g>
					<g>
						<rect x="346" y="365.46" class="st0" width="243.79" height="12.21"/>
						<text transform="matrix(1 0 0 1 346 372.8574)" class="st21 st22 st23">Lorem ipsum dolor sit amet, consectetur.</text>
					</g>
				</g>
				<g>
					<g>
						<text transform="matrix(1 0 0 1 346 391.75)" class="st15 st16 st17">ICE CREAM</text>
					</g>
					<g>
						<g>
							<line class="st18" x1="407" y1="391.33" x2="407" y2="391.33"/>
							<line class="st32" x1="413.01" y1="391.33" x2="548.2" y2="391.33"/>
							<line class="st18" x1="551.21" y1="391.33" x2="551.21" y2="391.33"/>
						</g>
					</g>
					<g>
						<text transform="matrix(1 0 0 1 556.3125 393)" class="st15 st20 st17">$ 5.00</text>
					</g>
					<g>
						<rect x="346" y="400.67" class="st0" width="243.79" height="13.54"/>
						<text transform="matrix(1 0 0 1 346 408.0654)" class="st21 st22 st23">Lorem ipsum dolor sit amet, consectetur adi cing.</text>
					</g>
				</g>
				<g>
					<g>
						<text transform="matrix(1 0 0 1 346 426.9585)" class="st15 st16 st17">CHOCOLATE CAKE</text>
					</g>
					<g>
						<g>
							<line class="st18" x1="444.38" y1="426.54" x2="444.38" y2="426.54"/>
							<line class="st33" x1="450.31" y1="426.54" x2="548.24" y2="426.54"/>
							<line class="st18" x1="551.21" y1="426.54" x2="551.21" y2="426.54"/>
						</g>
					</g>
					<g>
						<text transform="matrix(1 0 0 1 556.3125 428.2085)" class="st15 st20 st17">$ 5.00</text>
					</g>
					<g>
						<rect x="346" y="435.88" class="st0" width="243.79" height="13.54"/>
						<text transform="matrix(1 0 0 1 346 443.2739)" class="st21 st22 st23">Lorem ipsum dolor sit amet.</text>
					</g>
				</g>
				<g>
					<g>
						<text transform="matrix(1 0 0 1 346 462.1665)" class="st15 st16 st17">STRAWBERRY CAKE</text>
					</g>
					<g>
						<g>
							<line class="st18" x1="450.12" y1="461.75" x2="450.12" y2="461.75"/>
							<line class="st34" x1="456.07" y1="461.75" x2="548.24" y2="461.75"/>
							<line class="st18" x1="551.21" y1="461.75" x2="551.21" y2="461.75"/>
						</g>
					</g>
					<g>
						<text transform="matrix(1 0 0 1 556.3125 463.4165)" class="st15 st20 st17">$ 5.00</text>
					</g>
					<g>
						<rect x="346" y="471.08" class="st0" width="243.79" height="13.54"/>
						<text transform="matrix(1 0 0 1 346 478.4819)" class="st21 st22 st23">Lorem ipsum dolor sit amet, consetur adipis cing.</text>
					</g>
				</g>
				<g>
					<g>
						<text transform="matrix(1 0 0 1 346 497.3755)" class="st15 st16 st17">APPLE PIE</text>
					</g>
					<g>
						<g>
							<line class="st18" x1="397" y1="496.96" x2="397" y2="496.96"/>
							<line class="st35" x1="402.93" y1="496.96" x2="548.24" y2="496.96"/>
							<line class="st18" x1="551.21" y1="496.96" x2="551.21" y2="496.96"/>
						</g>
					</g>
					<g>
						<text transform="matrix(1 0 0 1 556.3125 498.6255)" class="st15 st20 st17">$ 5.00</text>
					</g>
					<g>
						<rect x="346" y="506.29" class="st0" width="243.79" height="13.54"/>
						<text transform="matrix(1 0 0 1 346 513.6909)" class="st21 st22 st23">Lorem ipsum dolor sit amet.</text>
					</g>
				</g>
			</g>
			<g>
				<text transform="matrix(1 0 0 1 344.1812 61.75)" class="st12 st13 st14">MAIN COURSES</text>
				<g>
					<g>
						<text transform="matrix(1 0 0 1 346 87.042)" class="st15 st16 st17">GRILLED FISH AND POTATOES</text>
					</g>
					<g>
						<g>
							<line class="st18" x1="497.88" y1="86.62" x2="497.88" y2="86.62"/>
							<line class="st36" x1="503.8" y1="86.62" x2="548.25" y2="86.62"/>
							<line class="st18" x1="551.21" y1="86.62" x2="551.21" y2="86.62"/>
						</g>
					</g>
					<g>
						<text transform="matrix(1 0 0 1 554.377 87.292)" class="st15 st20 st17">$ 10.00</text>
					</g>
					<g>
						<rect x="346" y="95.96" class="st0" width="243.79" height="22.67"/>
						<text transform="matrix(1 0 0 1 346 103.3574)"><tspan x="0" y="0" class="st21 st22 st23">Lorem ipsum dolor sit amet, consectetur adipis </tspan><tspan x="0" y="12" class="st21 st22 st23">cing elit mauris. </tspan></text>
					</g>
				</g>
				<g>
					<g>
						<text transform="matrix(1 0 0 1 346 135.9307)" class="st15 st16 st17">CHICKEN AND RICE</text>
					</g>
					<g>
						<g>
							<line class="st18" x1="449.5" y1="135.51" x2="449.5" y2="135.51"/>
							<line class="st37" x1="455.48" y1="135.51" x2="548.22" y2="135.51"/>
							<line class="st18" x1="551.21" y1="135.51" x2="551.21" y2="135.51"/>
						</g>
					</g>
					<g>
						<text transform="matrix(1 0 0 1 554.377 136.1807)" class="st15 st20 st17">$ 10.00</text>
					</g>
					<g>
						<rect x="346" y="144.85" class="st0" width="243.79" height="22.67"/>
						<text transform="matrix(1 0 0 1 346 152.2461)"><tspan x="0" y="0" class="st21 st22 st23">Lorem ipsum dolor sit amet, consectetur adipis </tspan><tspan x="0" y="12" class="st21 st22 st23">cing elit mauris. </tspan></text>
					</g>
				</g>
				<g>
					<g>
						<text transform="matrix(1 0 0 1 346 184.8198)" class="st15 st16 st17">TURKEY AND HAM PIE</text>
					</g>
					<g>
						<g>
							<line class="st18" x1="459.17" y1="184.4" x2="459.17" y2="184.4"/>
							<line class="st38" x1="465.3" y1="184.4" x2="548.14" y2="184.4"/>
							<line class="st18" x1="551.21" y1="184.4" x2="551.21" y2="184.4"/>
						</g>
					</g>
					<g>
						<text transform="matrix(1 0 0 1 554.377 185.0698)" class="st15 st20 st17">$ 10.00</text>
					</g>
					<g>
						<rect x="346" y="193.74" class="st0" width="243.79" height="22.67"/>
						<text transform="matrix(1 0 0 1 346 201.1353)"><tspan x="0" y="0" class="st21 st22 st23">Lorem ipsum dolor sit amet, consectetur adipis </tspan><tspan x="0" y="12" class="st21 st22 st23">cing elit mauris. </tspan></text>
					</g>
				</g>
				<g>
					<g>
						<text transform="matrix(1 0 0 1 554.377 234.6255)" class="st15 st20 st17">$ 10.00</text>
					</g>
					<g>
						<text transform="matrix(1 0 0 1 346 233.7085)" class="st15 st16 st17">VEGETABLE PASTA</text>
					</g>
					<g>
						<g>
							<line class="st18" x1="449.5" y1="233.29" x2="449.5" y2="233.29"/>
							<line class="st37" x1="455.48" y1="233.29" x2="548.22" y2="233.29"/>
							<line class="st18" x1="551.21" y1="233.29" x2="551.21" y2="233.29"/>
						</g>
					</g>
					<g>
						<rect x="346" y="242.62" class="st0" width="243.79" height="22.67"/>
						<text transform="matrix(1 0 0 1 346 250.0239)"><tspan x="0" y="0" class="st21 st22 st23">Lorem ipsum dolor sit amet, consectetur adipis </tspan><tspan x="0" y="12" class="st21 st22 st23">cing elit mauris. </tspan></text>
					</g>
				</g>
			</g>
			<g>
				<g>
					<g>
						<text transform="matrix(1 0 0 1 625.5464 262.8784)" class="st15 st16 st17">COFFEE</text>
					</g>
					<line class="st39" x1="668.5" y1="262.58" x2="760" y2="262.58"/>
					<g>
						<text transform="matrix(1 0 0 1 761.2373 263.3755)" class="st15 st20 st17">$ 2.00</text>
					</g>
					<g>
						<rect x="625.33" y="269.21" class="st0" width="137.5" height="13.54"/>
						<text transform="matrix(1 0 0 1 625.333 276.6074)" class="st21 st22 st23">Lorem ipsum dolor sit amet.</text>
					</g>
				</g>
				<g>
					<g>
						<text transform="matrix(1 0 0 1 625.5464 295.6699)" class="st15 st16 st17">TEA</text>
					</g>
					<line class="st39" x1="648.12" y1="295.38" x2="760" y2="295.38"/>
					<g>
						<text transform="matrix(1 0 0 1 761.2373 296.167)" class="st15 st20 st17">$ 2.00</text>
					</g>
					<g>
						<rect x="625.33" y="302" class="st0" width="137.5" height="13.54"/>
						<text transform="matrix(1 0 0 1 625.333 309.3994)" class="st21 st22 st23">Lorem ipsum dolor sit amet.</text>
					</g>
				</g>
				<g>
					<g>
						<text transform="matrix(1 0 0 1 625.5464 328.4614)" class="st15 st16 st17">WINES</text>
					</g>
					<line class="st39" x1="661.75" y1="328.17" x2="760" y2="328.17"/>
					<g>
						<text transform="matrix(1 0 0 1 761.2373 328.9585)" class="st15 st20 st17">$ 2.00</text>
					</g>
					<g>
						<rect x="625.33" y="334.79" class="st0" width="137.5" height="13.54"/>
						<text transform="matrix(1 0 0 1 625.333 342.1909)" class="st21 st22 st23">Lorem ipsum dolor sit amet.</text>
					</g>
				</g>
				<text transform="matrix(1 0 0 1 624.25 173.5835)" class="st12 st13 st14">DRINKS</text>
				<g>
					<g>
						<text transform="matrix(1 0 0 1 625.5464 197.2949)" class="st15 st16 st17">MINERAL WATER</text>
					</g>
					<line class="st39" x1="711.5" y1="197" x2="765.19" y2="197"/>
					<g>
						<text transform="matrix(1 0 0 1 761.2373 197.792)" class="st15 st20 st17">$ 2.00</text>
					</g>
					<g>
						<rect x="625.33" y="203.62" class="st0" width="137.5" height="13.54"/>
						<text transform="matrix(1 0 0 1 625.333 211.0239)" class="st21 st22 st23">Lorem ipsum dolor sit amet.</text>
					</g>
				</g>
				<g>
					<g>
						<text transform="matrix(1 0 0 1 625.5464 230.0864)" class="st15 st16 st17">FRESH FRUIT JUICE</text>
					</g>
					<line class="st39" x1="723.5" y1="229.79" x2="765.19" y2="229.79"/>
					<g>
						<text transform="matrix(1 0 0 1 761.2373 230.584)" class="st15 st20 st17">$ 2.00</text>
					</g>
					<g>
						<rect x="625.33" y="236.42" class="st0" width="137.5" height="13.54"/>
						<text transform="matrix(1 0 0 1 625.333 243.8159)" class="st21 st22 st23">Lorem ipsum dolor sit amet.</text>
					</g>
				</g>
			</g>
			<g>
				<text transform="matrix(1 0 0 1 630.7461 382.062)" class="st15 st20 st40">DAILY FROM 12PM - 23PM</text>
				<g>
					<path class="st27" d="M780.76,452.17H643.01c-7.11,0-12.88-5.76-12.88-12.88v-33.75c0-7.11,5.76-12.88,12.88-12.88h137.75
						c7.11,0,12.88,5.76,12.88,12.88v33.75C793.63,446.4,787.87,452.17,780.76,452.17z"/>
					<text transform="matrix(1 0 0 1 673.5093 412.0352)" class="st1 st13 st41">BOOK NOW</text>
					<text transform="matrix(1 0 0 1 641.8599 440.2432)" class="st1 st13 st42">089 12 456 78</text>
				</g>
			</g>
			<text transform="matrix(1 0 0 1 418.4604 577.3745)" class="st15 st26 st17">WWW.RESTAURANTWEBSITE.COM</text>
			<g>
				<g>
					<text transform="matrix(1 0 0 1 253.6367 70.4165)" class="st15 st20 st23">YOUR LOGO</text>
				</g>
				<g>
					<g>
						<g>
							<g>
								<path class="st15" d="M291.72,57.98H275.1c-0.26,0-0.46-0.2-0.46-0.45v-9.36c-2.43-1.15-3.98-3.56-3.98-6.2
									c0-3.29,2.43-6.14,5.72-6.77c0.44-3.41,3.47-6.03,7.04-6.03c3.57,0,6.6,2.62,7.04,6.03c3.28,0.63,5.71,3.48,5.71,6.77
									c0,2.64-1.55,5.04-3.98,6.2v9.36C292.19,57.78,291.98,57.98,291.72,57.98z M275.57,57.08h15.69v-9.2
									c0-0.18,0.11-0.34,0.28-0.41c2.25-0.95,3.7-3.11,3.7-5.5c0-2.96-2.27-5.52-5.28-5.94c-0.22-0.03-0.38-0.2-0.4-0.41
									c-0.24-3.11-2.94-5.55-6.15-5.55c-3.21,0-5.91,2.44-6.15,5.55c-0.02,0.21-0.18,0.38-0.4,0.41
									c-3.01,0.42-5.28,2.97-5.28,5.94c0,2.38,1.45,4.54,3.7,5.5c0.17,0.07,0.28,0.23,0.28,0.41V57.08z"/>
							</g>
						</g>
						<g>
							<path class="st15" d="M290.25,48.53c-2.41,0-3.91-1.47-3.99-1.54c-0.18-0.18-0.18-0.46,0.01-0.64
								c0.18-0.17,0.48-0.17,0.66,0.01c0.08,0.08,1.9,1.83,4.68,1.09c0.25-0.07,0.5,0.08,0.57,0.32c0.07,0.24-0.08,0.49-0.33,0.55
								C291.28,48.46,290.75,48.53,290.25,48.53z"/>
						</g>
						<g>
							<path class="st15" d="M276.44,48.5c-0.46,0-0.95-0.05-1.48-0.18c-0.25-0.06-0.4-0.31-0.34-0.55
								c0.06-0.24,0.31-0.39,0.56-0.33c2.81,0.68,4.63-1.17,4.65-1.19c0.18-0.18,0.47-0.19,0.66-0.02c0.19,0.17,0.2,0.46,0.02,0.64
								C280.44,46.95,278.92,48.5,276.44,48.5z"/>
						</g>
						<g>
							<path class="st15" d="M281.07,40.26C281.07,40.26,281.07,40.26,281.07,40.26c-1.51-0.02-2.7-0.46-3.52-1.33
								c-1.32-1.38-1.22-3.3-1.21-3.38c0.02-0.25,0.23-0.43,0.49-0.42c0.26,0.01,0.45,0.23,0.44,0.48c0,0.02-0.08,1.63,0.97,2.72
								c0.65,0.67,1.61,1.02,2.84,1.03c0.26,0,0.46,0.21,0.46,0.46C281.54,40.06,281.33,40.26,281.07,40.26z"/>
						</g>
						<g>
							<rect x="275.12" y="54.22" class="st15" width="16.45" height="1.07"/>
						</g>
					</g>
				</g>
			</g>
		</g>
	</g>
</g>
</svg>$svg$)
WHERE svg_url = '/templates/svg/restaurant-menu/menu-design.svg'
  AND svg_content IS NULL;

-- cafe-special: backfill from public/templates/svg/cafe-special/design.svg
UPDATE svg_templates
SET svg_content = TRIM(BOTH E' \t\r\n' FROM $svg$<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="coffeeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#4A3728;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2D1F14;stop-opacity:1" />
    </linearGradient>
    <style>
      .script { font-family: 'Georgia', serif; font-style: italic; }
      .heading { font-family: 'Arial Black', Arial, sans-serif; font-weight: 900; }
      .body { font-family: 'Arial', sans-serif; font-weight: 400; }
      .price { font-family: 'Arial', sans-serif; font-weight: 700; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1920" fill="url(#coffeeGradient)"/>

  <!-- Decorative pattern -->
  <circle cx="100" cy="200" r="150" fill="rgba(255,255,255,0.03)"/>
  <circle cx="980" cy="1700" r="200" fill="rgba(255,255,255,0.03)"/>

  <!-- Top decoration -->
  <rect x="100" y="80" width="880" height="4" fill="#D4A574"/>

  <!-- Header -->
  <text x="540" y="200" text-anchor="middle" class="script" fill="#D4A574" font-size="72">Today's Special</text>

  <!-- Main item -->
  <rect x="80" y="280" width="920" height="500" rx="20" fill="rgba(255,255,255,0.08)"/>

  <!-- Coffee cup icon placeholder -->
  <circle cx="540" cy="400" r="80" fill="rgba(212,165,116,0.2)" stroke="#D4A574" stroke-width="3"/>
  <text x="540" y="420" text-anchor="middle" class="body" fill="#D4A574" font-size="48">&#9749;</text>

  <text x="540" y="560" text-anchor="middle" class="heading" fill="white" font-size="56">CARAMEL LATTE</text>
  <text x="540" y="640" text-anchor="middle" class="body" fill="rgba(255,255,255,0.7)" font-size="28">Rich espresso with creamy caramel</text>
  <text x="540" y="690" text-anchor="middle" class="body" fill="rgba(255,255,255,0.7)" font-size="28">and steamed milk</text>

  <text x="540" y="760" text-anchor="middle" class="price" fill="#D4A574" font-size="64">$4.99</text>

  <!-- Divider -->
  <line x1="200" y1="860" x2="880" y2="860" stroke="#D4A574" stroke-width="2"/>

  <!-- Additional items -->
  <text x="540" y="960" text-anchor="middle" class="script" fill="#D4A574" font-size="48">Also try...</text>

  <!-- Item 1 -->
  <rect x="80" y="1020" width="920" height="160" rx="15" fill="rgba(255,255,255,0.05)"/>
  <text x="140" y="1100" class="heading" fill="white" font-size="36">Vanilla Cold Brew</text>
  <text x="140" y="1140" class="body" fill="rgba(255,255,255,0.6)" font-size="24">Smooth and refreshing</text>
  <text x="920" y="1115" text-anchor="end" class="price" fill="#D4A574" font-size="40">$3.99</text>

  <!-- Item 2 -->
  <rect x="80" y="1210" width="920" height="160" rx="15" fill="rgba(255,255,255,0.05)"/>
  <text x="140" y="1290" class="heading" fill="white" font-size="36">Mocha Frappe</text>
  <text x="140" y="1330" class="body" fill="rgba(255,255,255,0.6)" font-size="24">Chocolate coffee bliss</text>
  <text x="920" y="1305" text-anchor="end" class="price" fill="#D4A574" font-size="40">$5.49</text>

  <!-- Item 3 -->
  <rect x="80" y="1400" width="920" height="160" rx="15" fill="rgba(255,255,255,0.05)"/>
  <text x="140" y="1480" class="heading" fill="white" font-size="36">Chai Tea Latte</text>
  <text x="140" y="1520" class="body" fill="rgba(255,255,255,0.6)" font-size="24">Spiced and cozy</text>
  <text x="920" y="1495" text-anchor="end" class="price" fill="#D4A574" font-size="40">$4.29</text>

  <!-- Footer -->
  <rect x="100" y="1640" width="880" height="4" fill="#D4A574"/>

  <text x="540" y="1720" text-anchor="middle" class="body" fill="rgba(255,255,255,0.5)" font-size="28">Open Daily 6AM - 8PM</text>
  <text x="540" y="1780" text-anchor="middle" class="script" fill="#D4A574" font-size="40">THE DAILY GRIND CAFE</text>

  <!-- WiFi info -->
  <rect x="340" y="1830" width="400" height="60" rx="30" fill="rgba(255,255,255,0.1)"/>
  <text x="540" y="1870" text-anchor="middle" class="body" fill="rgba(255,255,255,0.7)" font-size="24">WiFi: CafeGuest</text>
</svg>$svg$)
WHERE svg_url = '/templates/svg/cafe-special/design.svg'
  AND svg_content IS NULL;

-- retail-sale: backfill from public/templates/svg/retail-sale/design.svg
UPDATE svg_templates
SET svg_content = TRIM(BOTH E' \t\r\n' FROM $svg$<?xml version="1.0" encoding="UTF-8"?>
<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FF6B35;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#F7931E;stop-opacity:1" />
    </linearGradient>
    <style>
      .title { font-family: 'Arial Black', Arial, sans-serif; font-weight: 900; }
      .subtitle { font-family: 'Arial', sans-serif; font-weight: 700; }
      .body { font-family: 'Arial', sans-serif; font-weight: 400; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="1920" height="1080" fill="url(#bgGradient)"/>

  <!-- Decorative circles -->
  <circle cx="150" cy="150" r="200" fill="rgba(255,255,255,0.1)"/>
  <circle cx="1800" cy="900" r="250" fill="rgba(255,255,255,0.1)"/>
  <circle cx="1700" cy="200" r="100" fill="rgba(255,255,255,0.08)"/>

  <!-- Main content area -->
  <rect x="100" y="150" width="1720" height="780" rx="20" fill="rgba(255,255,255,0.95)"/>

  <!-- SALE Badge -->
  <rect x="100" y="150" width="300" height="100" fill="#E53935"/>
  <text x="250" y="220" text-anchor="middle" class="title" fill="white" font-size="48">SALE</text>

  <!-- Main discount text -->
  <text x="960" y="400" text-anchor="middle" class="title" fill="#E53935" font-size="180">50% OFF</text>

  <!-- Subtitle -->
  <text x="960" y="520" text-anchor="middle" class="subtitle" fill="#333333" font-size="48">ON ALL SELECTED ITEMS</text>

  <!-- Description -->
  <text x="960" y="620" text-anchor="middle" class="body" fill="#666666" font-size="32">Limited time offer. While supplies last.</text>

  <!-- CTA Button -->
  <rect x="760" y="700" width="400" height="80" rx="40" fill="#E53935"/>
  <text x="960" y="755" text-anchor="middle" class="subtitle" fill="white" font-size="32">SHOP NOW</text>

  <!-- Store info -->
  <text x="960" y="880" text-anchor="middle" class="body" fill="#999999" font-size="24">Visit us at www.yourstore.com</text>

  <!-- Corner decorations -->
  <polygon points="1720,150 1820,150 1820,250" fill="#E53935"/>
  <polygon points="100,830 100,930 200,930" fill="#E53935"/>
</svg>$svg$)
WHERE svg_url = '/templates/svg/retail-sale/design.svg'
  AND svg_content IS NULL;

-- welcome-sign: backfill from public/templates/svg/welcome-sign/design.svg
UPDATE svg_templates
SET svg_content = TRIM(BOTH E' \t\r\n' FROM $svg$<?xml version="1.0" encoding="UTF-8"?>
<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#1E3A5F;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2C5282;stop-opacity:1" />
    </linearGradient>
    <style>
      .title { font-family: 'Georgia', serif; font-weight: 700; }
      .heading { font-family: 'Arial', sans-serif; font-weight: 700; }
      .body { font-family: 'Arial', sans-serif; font-weight: 400; }
    </style>
  </defs>

  <!-- Background -->
  <rect width="1920" height="1080" fill="#F8F9FA"/>

  <!-- Header bar -->
  <rect width="1920" height="200" fill="url(#headerGradient)"/>

  <!-- Company Logo placeholder -->
  <rect x="80" y="50" width="100" height="100" rx="10" fill="rgba(255,255,255,0.2)"/>
  <text x="130" y="115" text-anchor="middle" class="body" fill="white" font-size="14">LOGO</text>

  <!-- Company name -->
  <text x="220" y="120" class="heading" fill="white" font-size="48">COMPANY NAME</text>

  <!-- Main welcome text -->
  <text x="960" y="400" text-anchor="middle" class="title" fill="#1E3A5F" font-size="96">Welcome</text>

  <!-- Visitor info section -->
  <rect x="460" y="480" width="1000" height="300" rx="15" fill="white" stroke="#E2E8F0" stroke-width="2"/>

  <!-- Section labels -->
  <text x="560" y="540" class="heading" fill="#1E3A5F" font-size="24">Visitor Name</text>
  <text x="560" y="590" class="body" fill="#4A5568" font-size="36">John Smith</text>

  <line x1="960" y1="510" x2="960" y2="750" stroke="#E2E8F0" stroke-width="2"/>

  <text x="1060" y="540" class="heading" fill="#1E3A5F" font-size="24">Meeting With</text>
  <text x="1060" y="590" class="body" fill="#4A5568" font-size="36">Jane Doe</text>

  <line x1="460" y1="630" x2="1460" y2="630" stroke="#E2E8F0" stroke-width="2"/>

  <text x="560" y="700" class="heading" fill="#1E3A5F" font-size="24">Location</text>
  <text x="560" y="750" class="body" fill="#4A5568" font-size="36">Conference Room A</text>

  <!-- Footer -->
  <rect y="880" width="1920" height="200" fill="#1E3A5F"/>
  <text x="960" y="960" text-anchor="middle" class="body" fill="rgba(255,255,255,0.7)" font-size="24">Please check in at the reception desk</text>
  <text x="960" y="1010" text-anchor="middle" class="body" fill="rgba(255,255,255,0.5)" font-size="20">123 Business Street, Suite 100 | Tel: (555) 123-4567</text>
</svg>$svg$)
WHERE svg_url = '/templates/svg/welcome-sign/design.svg'
  AND svg_content IS NULL;

-- holiday-sale: backfill from public/templates/svg/holiday-sale/design.svg
UPDATE svg_templates
SET svg_content = TRIM(BOTH E' \t\r\n' FROM $svg$<?xml version="1.0" encoding="utf-8"?>
<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&amp;family=Playfair+Display:wght@700&amp;display=swap');
    </style>
    <linearGradient id="holidayGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a472a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2d5a3f;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1920" height="1080" fill="url(#holidayGradient)"/>

  <!-- Decorative circles -->
  <circle cx="150" cy="150" r="200" fill="#c41e3a" opacity="0.15"/>
  <circle cx="1770" cy="930" r="250" fill="#c41e3a" opacity="0.15"/>
  <circle cx="1800" cy="100" r="150" fill="#ffd700" opacity="0.1"/>

  <!-- Snowflake decorations -->
  <text x="100" y="200" font-family="Arial" font-size="60" fill="#ffffff" opacity="0.2">*</text>
  <text x="1750" y="150" font-family="Arial" font-size="80" fill="#ffffff" opacity="0.2">*</text>
  <text x="200" y="900" font-family="Arial" font-size="70" fill="#ffffff" opacity="0.2">*</text>

  <!-- Main content area -->
  <rect x="200" y="200" width="1520" height="680" rx="20" fill="#ffffff" opacity="0.95"/>

  <!-- Sale badge -->
  <circle cx="1550" cy="350" r="120" fill="#c41e3a"/>
  <text x="1550" y="330" font-family="Poppins, sans-serif" font-size="36" font-weight="700" fill="#ffffff" text-anchor="middle">UP TO</text>
  <text x="1550" y="390" font-family="Poppins, sans-serif" font-size="52" font-weight="700" fill="#ffd700" text-anchor="middle">50%</text>
  <text x="1550" y="430" font-family="Poppins, sans-serif" font-size="28" font-weight="600" fill="#ffffff" text-anchor="middle">OFF</text>

  <!-- Main heading -->
  <text x="960" y="380" font-family="Playfair Display, serif" font-size="96" font-weight="700" fill="#1a472a" text-anchor="middle">HOLIDAY SALE</text>

  <!-- Subheading -->
  <text x="960" y="480" font-family="Poppins, sans-serif" font-size="36" font-weight="400" fill="#2d5a3f" text-anchor="middle">Celebrate the Season with Amazing Deals</text>

  <!-- Divider -->
  <rect x="760" y="520" width="400" height="4" rx="2" fill="#c41e3a"/>

  <!-- Promotion details -->
  <text x="960" y="610" font-family="Poppins, sans-serif" font-size="28" font-weight="600" fill="#333333" text-anchor="middle">Use code: HOLIDAY2024</text>

  <!-- Valid dates -->
  <text x="960" y="700" font-family="Poppins, sans-serif" font-size="22" font-weight="400" fill="#666666" text-anchor="middle">Valid December 1-31, 2024</text>

  <!-- Call to action -->
  <rect x="760" y="750" width="400" height="70" rx="35" fill="#c41e3a"/>
  <text x="960" y="798" font-family="Poppins, sans-serif" font-size="28" font-weight="600" fill="#ffffff" text-anchor="middle">SHOP NOW</text>

  <!-- Bottom decorative bar -->
  <rect x="0" y="1020" width="1920" height="60" fill="#c41e3a"/>
  <text x="960" y="1060" font-family="Poppins, sans-serif" font-size="24" font-weight="400" fill="#ffffff" text-anchor="middle">www.yourstore.com</text>
</svg>$svg$)
WHERE svg_url = '/templates/svg/holiday-sale/design.svg'
  AND svg_content IS NULL;

-- real-estate: backfill from public/templates/svg/real-estate/design.svg
UPDATE svg_templates
SET svg_content = TRIM(BOTH E' \t\r\n' FROM $svg$<?xml version="1.0" encoding="utf-8"?>
<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&amp;family=Playfair+Display:wght@700&amp;display=swap');
    </style>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a365d;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2c5282;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1920" height="1080" fill="url(#bgGradient)"/>

  <!-- Decorative elements -->
  <rect x="0" y="0" width="600" height="1080" fill="#ffffff" opacity="0.05"/>
  <rect x="1700" y="200" width="4" height="680" fill="#d69e2e"/>

  <!-- Left content panel -->
  <rect x="80" y="100" width="700" height="880" rx="10" fill="#ffffff" opacity="0.98"/>

  <!-- Property status badge -->
  <rect x="80" y="100" width="200" height="50" fill="#d69e2e"/>
  <text x="180" y="135" font-family="Montserrat, sans-serif" font-size="20" font-weight="700" fill="#ffffff" text-anchor="middle">FOR SALE</text>

  <!-- Property image placeholder -->
  <rect x="100" y="170" width="660" height="350" rx="8" fill="#e2e8f0"/>
  <text x="430" y="360" font-family="Montserrat, sans-serif" font-size="24" fill="#718096" text-anchor="middle">Property Image</text>

  <!-- Property price -->
  <text x="430" y="590" font-family="Playfair Display, serif" font-size="56" font-weight="700" fill="#1a365d" text-anchor="middle">$1,250,000</text>

  <!-- Property address -->
  <text x="430" y="660" font-family="Montserrat, sans-serif" font-size="28" font-weight="600" fill="#2d3748" text-anchor="middle">123 Luxury Avenue</text>
  <text x="430" y="700" font-family="Montserrat, sans-serif" font-size="22" font-weight="400" fill="#718096" text-anchor="middle">Beverly Hills, CA 90210</text>

  <!-- Property features -->
  <rect x="150" y="740" width="130" height="80" rx="8" fill="#edf2f7"/>
  <text x="215" y="780" font-family="Montserrat, sans-serif" font-size="28" font-weight="700" fill="#1a365d" text-anchor="middle">4</text>
  <text x="215" y="805" font-family="Montserrat, sans-serif" font-size="14" font-weight="400" fill="#718096" text-anchor="middle">BEDROOMS</text>

  <rect x="300" y="740" width="130" height="80" rx="8" fill="#edf2f7"/>
  <text x="365" y="780" font-family="Montserrat, sans-serif" font-size="28" font-weight="700" fill="#1a365d" text-anchor="middle">3.5</text>
  <text x="365" y="805" font-family="Montserrat, sans-serif" font-size="14" font-weight="400" fill="#718096" text-anchor="middle">BATHROOMS</text>

  <rect x="450" y="740" width="130" height="80" rx="8" fill="#edf2f7"/>
  <text x="515" y="780" font-family="Montserrat, sans-serif" font-size="28" font-weight="700" fill="#1a365d" text-anchor="middle">3,200</text>
  <text x="515" y="805" font-family="Montserrat, sans-serif" font-size="14" font-weight="400" fill="#718096" text-anchor="middle">SQ FT</text>

  <rect x="600" y="740" width="130" height="80" rx="8" fill="#edf2f7"/>
  <text x="665" y="780" font-family="Montserrat, sans-serif" font-size="28" font-weight="700" fill="#1a365d" text-anchor="middle">2</text>
  <text x="665" y="805" font-family="Montserrat, sans-serif" font-size="14" font-weight="400" fill="#718096" text-anchor="middle">GARAGE</text>

  <!-- Contact info -->
  <rect x="150" y="860" width="560" height="70" rx="35" fill="#d69e2e"/>
  <text x="430" y="905" font-family="Montserrat, sans-serif" font-size="22" font-weight="600" fill="#ffffff" text-anchor="middle">Call Now: (555) 123-4567</text>

  <!-- Right content - Company branding -->
  <text x="1250" y="300" font-family="Playfair Display, serif" font-size="64" font-weight="700" fill="#ffffff" text-anchor="middle">PREMIER</text>
  <text x="1250" y="380" font-family="Montserrat, sans-serif" font-size="36" font-weight="300" fill="#d69e2e" text-anchor="middle" letter-spacing="8">REAL ESTATE</text>

  <!-- Tagline -->
  <text x="1250" y="500" font-family="Montserrat, sans-serif" font-size="22" font-weight="400" fill="#ffffff" opacity="0.8" text-anchor="middle">Your Dream Home Awaits</text>

  <!-- Agent info -->
  <rect x="1050" y="600" width="400" height="200" rx="10" fill="#ffffff" opacity="0.1"/>
  <text x="1250" y="670" font-family="Montserrat, sans-serif" font-size="24" font-weight="600" fill="#ffffff" text-anchor="middle">John Smith</text>
  <text x="1250" y="710" font-family="Montserrat, sans-serif" font-size="18" font-weight="400" fill="#d69e2e" text-anchor="middle">Licensed Real Estate Agent</text>
  <text x="1250" y="760" font-family="Montserrat, sans-serif" font-size="18" font-weight="400" fill="#ffffff" opacity="0.8" text-anchor="middle">john@premierrealestate.com</text>

  <!-- Website -->
  <text x="1250" y="920" font-family="Montserrat, sans-serif" font-size="20" font-weight="400" fill="#ffffff" opacity="0.7" text-anchor="middle">www.premierrealestate.com</text>
</svg>$svg$)
WHERE svg_url = '/templates/svg/real-estate/design.svg'
  AND svg_content IS NULL;

-- healthcare-info: backfill from public/templates/svg/healthcare-info/design.svg
UPDATE svg_templates
SET svg_content = TRIM(BOTH E' \t\r\n' FROM $svg$<?xml version="1.0" encoding="utf-8"?>
<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&amp;display=swap');
    </style>
  </defs>

  <!-- Background -->
  <rect width="1920" height="1080" fill="#f8fafc"/>

  <!-- Top header bar -->
  <rect x="0" y="0" width="1920" height="120" fill="#0891b2"/>

  <!-- Logo area -->
  <circle cx="120" cy="60" r="40" fill="#ffffff" opacity="0.2"/>
  <text x="120" y="70" font-family="Open Sans, sans-serif" font-size="32" font-weight="700" fill="#ffffff" text-anchor="middle">+</text>

  <!-- Clinic name -->
  <text x="200" y="50" font-family="Open Sans, sans-serif" font-size="28" font-weight="700" fill="#ffffff">CITY MEDICAL CENTER</text>
  <text x="200" y="85" font-family="Open Sans, sans-serif" font-size="18" font-weight="400" fill="#ffffff" opacity="0.9">Caring for Your Health Since 1985</text>

  <!-- Contact in header -->
  <text x="1750" y="50" font-family="Open Sans, sans-serif" font-size="18" font-weight="600" fill="#ffffff" text-anchor="end">Emergency: 911</text>
  <text x="1750" y="85" font-family="Open Sans, sans-serif" font-size="18" font-weight="400" fill="#ffffff" opacity="0.9" text-anchor="end">Appointments: (555) 234-5678</text>

  <!-- Main title -->
  <text x="960" y="220" font-family="Open Sans, sans-serif" font-size="48" font-weight="700" fill="#0891b2" text-anchor="middle">Our Services</text>
  <rect x="860" y="240" width="200" height="4" rx="2" fill="#0891b2"/>

  <!-- Services grid -->
  <!-- Row 1 -->
  <rect x="100" y="300" width="400" height="200" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <rect x="100" y="300" width="400" height="8" rx="4" fill="#0891b2"/>
  <text x="300" y="380" font-family="Open Sans, sans-serif" font-size="24" font-weight="700" fill="#1e293b" text-anchor="middle">Primary Care</text>
  <text x="300" y="420" font-family="Open Sans, sans-serif" font-size="16" font-weight="400" fill="#64748b" text-anchor="middle">General health checkups and</text>
  <text x="300" y="445" font-family="Open Sans, sans-serif" font-size="16" font-weight="400" fill="#64748b" text-anchor="middle">preventive care services</text>

  <rect x="540" y="300" width="400" height="200" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <rect x="540" y="300" width="400" height="8" rx="4" fill="#0d9488"/>
  <text x="740" y="380" font-family="Open Sans, sans-serif" font-size="24" font-weight="700" fill="#1e293b" text-anchor="middle">Pediatrics</text>
  <text x="740" y="420" font-family="Open Sans, sans-serif" font-size="16" font-weight="400" fill="#64748b" text-anchor="middle">Specialized care for infants,</text>
  <text x="740" y="445" font-family="Open Sans, sans-serif" font-size="16" font-weight="400" fill="#64748b" text-anchor="middle">children, and adolescents</text>

  <rect x="980" y="300" width="400" height="200" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <rect x="980" y="300" width="400" height="8" rx="4" fill="#7c3aed"/>
  <text x="1180" y="380" font-family="Open Sans, sans-serif" font-size="24" font-weight="700" fill="#1e293b" text-anchor="middle">Cardiology</text>
  <text x="1180" y="420" font-family="Open Sans, sans-serif" font-size="16" font-weight="400" fill="#64748b" text-anchor="middle">Heart health diagnostics</text>
  <text x="1180" y="445" font-family="Open Sans, sans-serif" font-size="16" font-weight="400" fill="#64748b" text-anchor="middle">and treatment</text>

  <rect x="1420" y="300" width="400" height="200" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <rect x="1420" y="300" width="400" height="8" rx="4" fill="#dc2626"/>
  <text x="1620" y="380" font-family="Open Sans, sans-serif" font-size="24" font-weight="700" fill="#1e293b" text-anchor="middle">Urgent Care</text>
  <text x="1620" y="420" font-family="Open Sans, sans-serif" font-size="16" font-weight="400" fill="#64748b" text-anchor="middle">Walk-in care for non-life</text>
  <text x="1620" y="445" font-family="Open Sans, sans-serif" font-size="16" font-weight="400" fill="#64748b" text-anchor="middle">threatening emergencies</text>

  <!-- Row 2 -->
  <rect x="320" y="540" width="400" height="200" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <rect x="320" y="540" width="400" height="8" rx="4" fill="#ea580c"/>
  <text x="520" y="620" font-family="Open Sans, sans-serif" font-size="24" font-weight="700" fill="#1e293b" text-anchor="middle">Orthopedics</text>
  <text x="520" y="660" font-family="Open Sans, sans-serif" font-size="16" font-weight="400" fill="#64748b" text-anchor="middle">Bone, joint, and muscle</text>
  <text x="520" y="685" font-family="Open Sans, sans-serif" font-size="16" font-weight="400" fill="#64748b" text-anchor="middle">care and rehabilitation</text>

  <rect x="760" y="540" width="400" height="200" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <rect x="760" y="540" width="400" height="8" rx="4" fill="#16a34a"/>
  <text x="960" y="620" font-family="Open Sans, sans-serif" font-size="24" font-weight="700" fill="#1e293b" text-anchor="middle">Laboratory</text>
  <text x="960" y="660" font-family="Open Sans, sans-serif" font-size="16" font-weight="400" fill="#64748b" text-anchor="middle">Full-service diagnostic</text>
  <text x="960" y="685" font-family="Open Sans, sans-serif" font-size="16" font-weight="400" fill="#64748b" text-anchor="middle">testing and imaging</text>

  <rect x="1200" y="540" width="400" height="200" rx="12" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <rect x="1200" y="540" width="400" height="8" rx="4" fill="#2563eb"/>
  <text x="1400" y="620" font-family="Open Sans, sans-serif" font-size="24" font-weight="700" fill="#1e293b" text-anchor="middle">Mental Health</text>
  <text x="1400" y="660" font-family="Open Sans, sans-serif" font-size="16" font-weight="400" fill="#64748b" text-anchor="middle">Counseling and psychiatric</text>
  <text x="1400" y="685" font-family="Open Sans, sans-serif" font-size="16" font-weight="400" fill="#64748b" text-anchor="middle">services</text>

  <!-- Hours section -->
  <rect x="100" y="800" width="800" height="180" rx="12" fill="#0891b2" opacity="0.1"/>
  <text x="500" y="860" font-family="Open Sans, sans-serif" font-size="28" font-weight="700" fill="#0891b2" text-anchor="middle">Hours of Operation</text>
  <text x="500" y="910" font-family="Open Sans, sans-serif" font-size="20" font-weight="400" fill="#1e293b" text-anchor="middle">Monday - Friday: 8:00 AM - 8:00 PM</text>
  <text x="500" y="945" font-family="Open Sans, sans-serif" font-size="20" font-weight="400" fill="#1e293b" text-anchor="middle">Saturday - Sunday: 9:00 AM - 5:00 PM</text>

  <!-- Address section -->
  <rect x="1020" y="800" width="800" height="180" rx="12" fill="#0891b2" opacity="0.1"/>
  <text x="1420" y="860" font-family="Open Sans, sans-serif" font-size="28" font-weight="700" fill="#0891b2" text-anchor="middle">Visit Us</text>
  <text x="1420" y="910" font-family="Open Sans, sans-serif" font-size="20" font-weight="400" fill="#1e293b" text-anchor="middle">456 Healthcare Boulevard, Suite 100</text>
  <text x="1420" y="945" font-family="Open Sans, sans-serif" font-size="20" font-weight="400" fill="#1e293b" text-anchor="middle">Medical City, MC 12345</text>

  <!-- Bottom bar -->
  <rect x="0" y="1020" width="1920" height="60" fill="#0891b2"/>
  <text x="960" y="1058" font-family="Open Sans, sans-serif" font-size="20" font-weight="400" fill="#ffffff" text-anchor="middle">www.citymedicalcenter.com | insurance@citymedical.com</text>
</svg>$svg$)
WHERE svg_url = '/templates/svg/healthcare-info/design.svg'
  AND svg_content IS NULL;

-- corporate-welcome: backfill from public/templates/svg/corporate-welcome/design.svg
UPDATE svg_templates
SET svg_content = TRIM(BOTH E' \t\r\n' FROM $svg$<?xml version="1.0" encoding="utf-8"?>
<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&amp;display=swap');
    </style>
    <linearGradient id="corpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e293b;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1920" height="1080" fill="url(#corpGradient)"/>

  <!-- Geometric decorations -->
  <rect x="0" y="0" width="8" height="1080" fill="#3b82f6"/>
  <rect x="1912" y="0" width="8" height="1080" fill="#3b82f6"/>
  <rect x="0" y="0" width="1920" height="8" fill="#3b82f6"/>
  <rect x="0" y="1072" width="1920" height="8" fill="#3b82f6"/>

  <!-- Accent shapes -->
  <polygon points="1920,0 1920,400 1520,0" fill="#3b82f6" opacity="0.1"/>
  <polygon points="0,1080 0,680 400,1080" fill="#3b82f6" opacity="0.1"/>

  <!-- Company logo area -->
  <rect x="760" y="80" width="400" height="100" rx="8" fill="#ffffff" opacity="0.1"/>
  <text x="960" y="145" font-family="Inter, sans-serif" font-size="36" font-weight="700" fill="#ffffff" text-anchor="middle">COMPANY LOGO</text>

  <!-- Main welcome message -->
  <text x="960" y="320" font-family="Inter, sans-serif" font-size="28" font-weight="300" fill="#94a3b8" text-anchor="middle" letter-spacing="12">WELCOME TO</text>
  <text x="960" y="440" font-family="Inter, sans-serif" font-size="96" font-weight="700" fill="#ffffff" text-anchor="middle">INNOVATE CORP</text>
  <text x="960" y="520" font-family="Inter, sans-serif" font-size="28" font-weight="400" fill="#3b82f6" text-anchor="middle">Technology Solutions for Tomorrow</text>

  <!-- Divider -->
  <rect x="760" y="580" width="400" height="2" fill="#3b82f6"/>

  <!-- Meeting info or welcome text -->
  <text x="960" y="680" font-family="Inter, sans-serif" font-size="32" font-weight="500" fill="#ffffff" text-anchor="middle">Today's Meeting</text>
  <text x="960" y="740" font-family="Inter, sans-serif" font-size="48" font-weight="600" fill="#3b82f6" text-anchor="middle">Q4 Strategy Review</text>
  <text x="960" y="800" font-family="Inter, sans-serif" font-size="24" font-weight="400" fill="#94a3b8" text-anchor="middle">Conference Room A | 2:00 PM</text>

  <!-- Guest name area -->
  <rect x="660" y="860" width="600" height="80" rx="40" fill="#3b82f6"/>
  <text x="960" y="912" font-family="Inter, sans-serif" font-size="28" font-weight="500" fill="#ffffff" text-anchor="middle">Welcome, Distinguished Guests</text>

  <!-- Bottom info -->
  <text x="960" y="1020" font-family="Inter, sans-serif" font-size="18" font-weight="400" fill="#64748b" text-anchor="middle">WiFi: InnovateCorp-Guest | Password: Welcome2024</text>
</svg>$svg$)
WHERE svg_url = '/templates/svg/corporate-welcome/design.svg'
  AND svg_content IS NULL;

-- happy-hour: backfill from public/templates/svg/happy-hour/design.svg
UPDATE svg_templates
SET svg_content = TRIM(BOTH E' \t\r\n' FROM $svg$<?xml version="1.0" encoding="utf-8"?>
<svg viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&amp;family=Fredericka+the+Great&amp;display=swap');
    </style>
    <linearGradient id="happyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1920" fill="url(#happyGradient)"/>

  <!-- Decorative circles -->
  <circle cx="100" cy="200" r="150" fill="#f59e0b" opacity="0.15"/>
  <circle cx="980" cy="1700" r="200" fill="#f59e0b" opacity="0.1"/>
  <circle cx="900" cy="400" r="100" fill="#ec4899" opacity="0.1"/>

  <!-- Top section -->
  <text x="540" y="180" font-family="Poppins, sans-serif" font-size="32" font-weight="400" fill="#f59e0b" text-anchor="middle" letter-spacing="8">EVERY WEEKDAY</text>

  <!-- Main heading -->
  <text x="540" y="320" font-family="Fredericka the Great, cursive" font-size="120" fill="#ffffff" text-anchor="middle">Happy</text>
  <text x="540" y="460" font-family="Fredericka the Great, cursive" font-size="120" fill="#f59e0b" text-anchor="middle">Hour</text>

  <!-- Time -->
  <rect x="190" y="520" width="700" height="120" rx="60" fill="#f59e0b"/>
  <text x="540" y="600" font-family="Poppins, sans-serif" font-size="56" font-weight="800" fill="#1a1a2e" text-anchor="middle">4PM - 7PM</text>

  <!-- Divider -->
  <rect x="390" y="700" width="300" height="4" rx="2" fill="#f59e0b" opacity="0.5"/>

  <!-- Specials section -->
  <text x="540" y="820" font-family="Poppins, sans-serif" font-size="40" font-weight="700" fill="#ffffff" text-anchor="middle">DRINK SPECIALS</text>

  <!-- Drink items -->
  <rect x="100" y="880" width="880" height="120" rx="12" fill="#ffffff" opacity="0.1"/>
  <text x="160" y="950" font-family="Poppins, sans-serif" font-size="32" font-weight="400" fill="#ffffff">Draft Beer</text>
  <text x="920" y="950" font-family="Poppins, sans-serif" font-size="32" font-weight="700" fill="#f59e0b" text-anchor="end">$4</text>

  <rect x="100" y="1020" width="880" height="120" rx="12" fill="#ffffff" opacity="0.1"/>
  <text x="160" y="1090" font-family="Poppins, sans-serif" font-size="32" font-weight="400" fill="#ffffff">House Wine</text>
  <text x="920" y="1090" font-family="Poppins, sans-serif" font-size="32" font-weight="700" fill="#f59e0b" text-anchor="end">$5</text>

  <rect x="100" y="1160" width="880" height="120" rx="12" fill="#ffffff" opacity="0.1"/>
  <text x="160" y="1230" font-family="Poppins, sans-serif" font-size="32" font-weight="400" fill="#ffffff">Well Cocktails</text>
  <text x="920" y="1230" font-family="Poppins, sans-serif" font-size="32" font-weight="700" fill="#f59e0b" text-anchor="end">$6</text>

  <rect x="100" y="1300" width="880" height="120" rx="12" fill="#ffffff" opacity="0.1"/>
  <text x="160" y="1370" font-family="Poppins, sans-serif" font-size="32" font-weight="400" fill="#ffffff">Premium Cocktails</text>
  <text x="920" y="1370" font-family="Poppins, sans-serif" font-size="32" font-weight="700" fill="#f59e0b" text-anchor="end">$8</text>

  <!-- Food special -->
  <rect x="140" y="1480" width="800" height="180" rx="16" fill="#ec4899" opacity="0.2" stroke="#ec4899" stroke-width="2"/>
  <text x="540" y="1560" font-family="Poppins, sans-serif" font-size="28" font-weight="600" fill="#ec4899" text-anchor="middle">FOOD SPECIAL</text>
  <text x="540" y="1620" font-family="Poppins, sans-serif" font-size="36" font-weight="700" fill="#ffffff" text-anchor="middle">50% OFF All Appetizers</text>

  <!-- Bar name -->
  <text x="540" y="1780" font-family="Poppins, sans-serif" font-size="48" font-weight="700" fill="#ffffff" text-anchor="middle">THE SOCIAL BAR</text>
  <text x="540" y="1840" font-family="Poppins, sans-serif" font-size="24" font-weight="400" fill="#94a3b8" text-anchor="middle">123 Main Street | @thesocialbar</text>
</svg>$svg$)
WHERE svg_url = '/templates/svg/happy-hour/design.svg'
  AND svg_content IS NULL;

-- fitness-promo: backfill from public/templates/svg/fitness-promo/design.svg
UPDATE svg_templates
SET svg_content = TRIM(BOTH E' \t\r\n' FROM $svg$<?xml version="1.0" encoding="utf-8"?>
<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&amp;family=Roboto:wght@300;400;500&amp;display=swap');
    </style>
    <linearGradient id="fitnessGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0f0f0f;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1920" height="1080" fill="url(#fitnessGradient)"/>

  <!-- Accent lines -->
  <rect x="0" y="0" width="12" height="1080" fill="#ef4444"/>
  <rect x="100" y="200" width="4" height="680" fill="#ef4444" opacity="0.3"/>

  <!-- Dynamic shapes -->
  <polygon points="1920,0 1920,600 1320,0" fill="#ef4444" opacity="0.1"/>
  <polygon points="1920,1080 1920,480 1400,1080" fill="#ef4444" opacity="0.05"/>

  <!-- Main content -->
  <text x="160" y="200" font-family="Oswald, sans-serif" font-size="24" font-weight="400" fill="#ef4444" letter-spacing="8">NEW YEAR SPECIAL</text>

  <text x="160" y="340" font-family="Oswald, sans-serif" font-size="140" font-weight="700" fill="#ffffff">JOIN NOW</text>
  <text x="160" y="480" font-family="Oswald, sans-serif" font-size="140" font-weight="700" fill="#ef4444">PAY LATER</text>

  <!-- Offer details -->
  <text x="160" y="600" font-family="Roboto, sans-serif" font-size="36" font-weight="300" fill="#ffffff" opacity="0.9">First Month FREE + No Enrollment Fee</text>

  <!-- Features -->
  <rect x="160" y="680" width="600" height="240" rx="8" fill="#1f1f1f"/>

  <circle cx="210" cy="740" r="12" fill="#ef4444"/>
  <text x="240" y="750" font-family="Roboto, sans-serif" font-size="24" font-weight="400" fill="#ffffff">24/7 Gym Access</text>

  <circle cx="210" cy="800" r="12" fill="#ef4444"/>
  <text x="240" y="810" font-family="Roboto, sans-serif" font-size="24" font-weight="400" fill="#ffffff">Free Personal Training Session</text>

  <circle cx="210" cy="860" r="12" fill="#ef4444"/>
  <text x="240" y="870" font-family="Roboto, sans-serif" font-size="24" font-weight="400" fill="#ffffff">Access to All Group Classes</text>

  <!-- Price highlight -->
  <rect x="1200" y="280" width="560" height="400" rx="16" fill="#ef4444"/>
  <text x="1480" y="400" font-family="Oswald, sans-serif" font-size="32" font-weight="500" fill="#ffffff" text-anchor="middle">STARTING AT</text>
  <text x="1480" y="520" font-family="Oswald, sans-serif" font-size="140" font-weight="700" fill="#ffffff" text-anchor="middle">$29</text>
  <text x="1480" y="580" font-family="Roboto, sans-serif" font-size="28" font-weight="400" fill="#ffffff" opacity="0.9" text-anchor="middle">/month</text>
  <text x="1480" y="640" font-family="Roboto, sans-serif" font-size="20" font-weight="300" fill="#ffffff" opacity="0.8" text-anchor="middle">*With 12-month commitment</text>

  <!-- CTA -->
  <rect x="1200" y="760" width="560" height="100" rx="50" fill="#ffffff"/>
  <text x="1480" y="825" font-family="Oswald, sans-serif" font-size="36" font-weight="600" fill="#0f0f0f" text-anchor="middle">GET STARTED TODAY</text>

  <!-- Gym name -->
  <text x="1480" y="940" font-family="Oswald, sans-serif" font-size="48" font-weight="700" fill="#ffffff" text-anchor="middle">IRON FORGE GYM</text>
  <text x="1480" y="990" font-family="Roboto, sans-serif" font-size="22" font-weight="400" fill="#666666" text-anchor="middle">www.ironforgegym.com | (555) 456-7890</text>

  <!-- Limited time badge -->
  <rect x="1580" y="180" width="240" height="60" rx="30" fill="#ffffff"/>
  <text x="1700" y="220" font-family="Oswald, sans-serif" font-size="24" font-weight="600" fill="#ef4444" text-anchor="middle">LIMITED TIME</text>
</svg>$svg$)
WHERE svg_url = '/templates/svg/fitness-promo/design.svg'
  AND svg_content IS NULL;

-- hotel-amenities: backfill from public/templates/svg/hotel-amenities/design.svg
UPDATE svg_templates
SET svg_content = TRIM(BOTH E' \t\r\n' FROM $svg$<?xml version="1.0" encoding="utf-8"?>
<svg viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&amp;family=Lato:wght@300;400;700&amp;display=swap');
    </style>
  </defs>

  <!-- Background -->
  <rect width="1080" height="1920" fill="#f5f5f0"/>

  <!-- Top decorative band -->
  <rect x="0" y="0" width="1080" height="200" fill="#1a365d"/>
  <rect x="0" y="180" width="1080" height="40" fill="#d4af37"/>

  <!-- Hotel logo area -->
  <circle cx="540" cy="100" r="60" fill="#d4af37" opacity="0.2"/>
  <text x="540" y="115" font-family="Playfair Display, serif" font-size="48" font-weight="700" fill="#ffffff" text-anchor="middle">G</text>

  <!-- Hotel name -->
  <text x="540" y="320" font-family="Playfair Display, serif" font-size="56" font-weight="600" fill="#1a365d" text-anchor="middle">THE GRAND HOTEL</text>
  <rect x="390" y="350" width="300" height="3" fill="#d4af37"/>
  <text x="540" y="410" font-family="Lato, sans-serif" font-size="28" font-weight="300" fill="#64748b" text-anchor="middle" letter-spacing="4">GUEST SERVICES</text>

  <!-- Amenities section -->
  <text x="540" y="530" font-family="Playfair Display, serif" font-size="36" font-weight="600" fill="#1a365d" text-anchor="middle">Hotel Amenities</text>

  <!-- Amenity items -->
  <rect x="80" y="580" width="920" height="100" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
  <circle cx="150" cy="630" r="30" fill="#1a365d" opacity="0.1"/>
  <text x="150" y="640" font-family="Lato, sans-serif" font-size="24" fill="#1a365d" text-anchor="middle">W</text>
  <text x="210" y="640" font-family="Lato, sans-serif" font-size="26" font-weight="700" fill="#1a365d">Free WiFi</text>
  <text x="920" y="640" font-family="Lato, sans-serif" font-size="20" font-weight="400" fill="#64748b" text-anchor="end">Network: GrandGuest</text>

  <rect x="80" y="700" width="920" height="100" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
  <circle cx="150" cy="750" r="30" fill="#1a365d" opacity="0.1"/>
  <text x="150" y="760" font-family="Lato, sans-serif" font-size="24" fill="#1a365d" text-anchor="middle">P</text>
  <text x="210" y="760" font-family="Lato, sans-serif" font-size="26" font-weight="700" fill="#1a365d">Pool &amp; Spa</text>
  <text x="920" y="760" font-family="Lato, sans-serif" font-size="20" font-weight="400" fill="#64748b" text-anchor="end">6 AM - 10 PM</text>

  <rect x="80" y="820" width="920" height="100" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
  <circle cx="150" cy="870" r="30" fill="#1a365d" opacity="0.1"/>
  <text x="150" y="880" font-family="Lato, sans-serif" font-size="24" fill="#1a365d" text-anchor="middle">F</text>
  <text x="210" y="880" font-family="Lato, sans-serif" font-size="26" font-weight="700" fill="#1a365d">Fitness Center</text>
  <text x="920" y="880" font-family="Lato, sans-serif" font-size="20" font-weight="400" fill="#64748b" text-anchor="end">24 Hours</text>

  <rect x="80" y="940" width="920" height="100" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
  <circle cx="150" cy="990" r="30" fill="#1a365d" opacity="0.1"/>
  <text x="150" y="1000" font-family="Lato, sans-serif" font-size="24" fill="#1a365d" text-anchor="middle">R</text>
  <text x="210" y="1000" font-family="Lato, sans-serif" font-size="26" font-weight="700" fill="#1a365d">Restaurant</text>
  <text x="920" y="1000" font-family="Lato, sans-serif" font-size="20" font-weight="400" fill="#64748b" text-anchor="end">Lobby Level</text>

  <!-- Dining section -->
  <text x="540" y="1140" font-family="Playfair Display, serif" font-size="36" font-weight="600" fill="#1a365d" text-anchor="middle">Dining Hours</text>

  <rect x="80" y="1180" width="440" height="140" rx="8" fill="#1a365d"/>
  <text x="300" y="1240" font-family="Lato, sans-serif" font-size="24" font-weight="700" fill="#d4af37" text-anchor="middle">BREAKFAST</text>
  <text x="300" y="1280" font-family="Lato, sans-serif" font-size="22" font-weight="400" fill="#ffffff" text-anchor="middle">6:30 AM - 10:30 AM</text>

  <rect x="560" y="1180" width="440" height="140" rx="8" fill="#1a365d"/>
  <text x="780" y="1240" font-family="Lato, sans-serif" font-size="24" font-weight="700" fill="#d4af37" text-anchor="middle">DINNER</text>
  <text x="780" y="1280" font-family="Lato, sans-serif" font-size="22" font-weight="400" fill="#ffffff" text-anchor="middle">5:30 PM - 10:00 PM</text>

  <!-- Contact section -->
  <rect x="80" y="1380" width="920" height="200" rx="12" fill="#d4af37" opacity="0.15"/>
  <text x="540" y="1450" font-family="Playfair Display, serif" font-size="32" font-weight="600" fill="#1a365d" text-anchor="middle">Need Assistance?</text>
  <text x="540" y="1510" font-family="Lato, sans-serif" font-size="28" font-weight="400" fill="#1a365d" text-anchor="middle">Dial 0 for Front Desk</text>
  <text x="540" y="1550" font-family="Lato, sans-serif" font-size="22" font-weight="300" fill="#64748b" text-anchor="middle">Available 24 hours</text>

  <!-- Room service -->
  <rect x="80" y="1620" width="920" height="120" rx="8" fill="#ffffff" stroke="#d4af37" stroke-width="2"/>
  <text x="540" y="1680" font-family="Lato, sans-serif" font-size="28" font-weight="700" fill="#1a365d" text-anchor="middle">Room Service Available</text>
  <text x="540" y="1720" font-family="Lato, sans-serif" font-size="20" font-weight="400" fill="#64748b" text-anchor="middle">Dial 7 | Menu in room folder</text>

  <!-- Footer -->
  <rect x="0" y="1800" width="1080" height="120" fill="#1a365d"/>
  <text x="540" y="1860" font-family="Playfair Display, serif" font-size="28" font-weight="500" fill="#ffffff" text-anchor="middle">Thank you for staying with us</text>
  <text x="540" y="1900" font-family="Lato, sans-serif" font-size="18" font-weight="300" fill="#d4af37" text-anchor="middle">www.thegrandhotel.com</text>
</svg>$svg$)
WHERE svg_url = '/templates/svg/hotel-amenities/design.svg'
  AND svg_content IS NULL;

-- event-promo: backfill from public/templates/svg/event-promo/design.svg
UPDATE svg_templates
SET svg_content = TRIM(BOTH E' \t\r\n' FROM $svg$<?xml version="1.0" encoding="utf-8"?>
<svg viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&amp;family=Roboto:wght@300;400;500;700&amp;display=swap');
    </style>
    <linearGradient id="eventGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#a855f7;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1920" height="1080" fill="url(#eventGradient)"/>

  <!-- Decorative elements -->
  <circle cx="200" cy="540" r="400" fill="#ffffff" opacity="0.05"/>
  <circle cx="1720" cy="540" r="350" fill="#ffffff" opacity="0.05"/>
  <circle cx="960" cy="100" r="200" fill="#ffffff" opacity="0.03"/>
  <circle cx="960" cy="980" r="200" fill="#ffffff" opacity="0.03"/>

  <!-- Stars/sparkles -->
  <text x="300" y="200" font-family="Arial" font-size="40" fill="#ffffff" opacity="0.3">*</text>
  <text x="1600" y="150" font-family="Arial" font-size="50" fill="#ffffff" opacity="0.3">*</text>
  <text x="150" y="800" font-family="Arial" font-size="35" fill="#ffffff" opacity="0.3">*</text>
  <text x="1750" y="900" font-family="Arial" font-size="45" fill="#ffffff" opacity="0.3">*</text>

  <!-- Event badge -->
  <rect x="760" y="80" width="400" height="60" rx="30" fill="#ffffff" opacity="0.2"/>
  <text x="960" y="122" font-family="Roboto, sans-serif" font-size="24" font-weight="500" fill="#ffffff" text-anchor="middle" letter-spacing="4">LIVE EVENT</text>

  <!-- Main event name -->
  <text x="960" y="320" font-family="Bebas Neue, sans-serif" font-size="180" fill="#ffffff" text-anchor="middle">SUMMER</text>
  <text x="960" y="500" font-family="Bebas Neue, sans-serif" font-size="180" fill="#fde047" text-anchor="middle">MUSIC FEST</text>

  <!-- Tagline -->
  <text x="960" y="580" font-family="Roboto, sans-serif" font-size="32" font-weight="300" fill="#ffffff" text-anchor="middle">The Ultimate Music Experience</text>

  <!-- Divider -->
  <rect x="760" y="620" width="400" height="4" rx="2" fill="#ffffff" opacity="0.5"/>

  <!-- Event details -->
  <text x="960" y="720" font-family="Bebas Neue, sans-serif" font-size="64" fill="#ffffff" text-anchor="middle">AUGUST 15-17, 2024</text>

  <!-- Location -->
  <text x="960" y="800" font-family="Roboto, sans-serif" font-size="28" font-weight="400" fill="#ffffff" opacity="0.9" text-anchor="middle">Central Park Amphitheater | New York City</text>

  <!-- Featured artists section -->
  <rect x="260" y="860" width="600" height="120" rx="12" fill="#ffffff" opacity="0.15"/>
  <text x="560" y="920" font-family="Roboto, sans-serif" font-size="20" font-weight="500" fill="#ffffff" text-anchor="middle">FEATURING</text>
  <text x="560" y="960" font-family="Roboto, sans-serif" font-size="28" font-weight="700" fill="#fde047" text-anchor="middle">Artist Name | Band Name | DJ Name</text>

  <!-- CTA -->
  <rect x="1060" y="860" width="600" height="120" rx="60" fill="#ffffff"/>
  <text x="1360" y="935" font-family="Bebas Neue, sans-serif" font-size="48" fill="#7c3aed" text-anchor="middle">GET TICKETS NOW</text>

  <!-- Bottom info -->
  <rect x="0" y="1020" width="1920" height="60" fill="#000000" opacity="0.3"/>
  <text x="960" y="1060" font-family="Roboto, sans-serif" font-size="24" font-weight="400" fill="#ffffff" text-anchor="middle">www.summermusicfest.com | @summermusicfest | #SummerFest2024</text>
</svg>$svg$)
WHERE svg_url = '/templates/svg/event-promo/design.svg'
  AND svg_content IS NULL;

-- ============================================================================
-- SELF-ASSERTING VERIFICATION — all active rows have svg_content populated
-- ============================================================================
DO $$
DECLARE
  v_missing INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_missing
    FROM svg_templates
    WHERE is_active = TRUE
      AND svg_content IS NULL;
  ASSERT v_missing = 0,
    format('expected 0 active svg_templates rows with svg_content IS NULL after backfill, got %s', v_missing);
END $$;

<?php
/**
 * Mail "Nuevo pedido" (el que le llega a la tienda, no al cliente):
 *
 * 1. Total de viandas del pedido. Los combos son productos simples y la cantidad de
 *    viandas está solo en el nombre ("COMBO SIBO x 15 viandas", "Combo LEANCUT (7
 *    viandas)"), así que se saca de ahí. Todo lo demás (platos, empanadas, pizzas,
 *    tartas) cuenta 1 vianda por unidad: un "Empanadas de carne" es una vianda de 4
 *    empanadas. Si un producto de la categoría Combos no tiene número en el nombre,
 *    se cuenta como 1 y el mail avisa que hay que revisarlo.
 *
 * 2. Talón de entrega recortable, "Recibí mis viandas en conformidad", para que el
 *    chofer lo haga firmar: queda como comprobante de entrega ante un contracargo de
 *    Mercado Pago. Va en todos los "Nuevo pedido", también en los de transferencia
 *    (que llegan "en espera" de pago).
 *
 * Se usa el nombre del ítem guardado en el pedido, no el del producto actual: si
 * después se renombra un combo, los pedidos viejos siguen contando bien.
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * @return array{total:int, items:array<int,array{name:string,qty:int,viandas:int}>, review:string[]}
 */
function homefood_order_viandas( WC_Order $order ) {
	$total  = 0;
	$items  = [];
	$review = [];

	foreach ( $order->get_items() as $item ) {
		$qty  = (int) $item->get_quantity();
		$name = $item->get_name();

		if ( preg_match( '/(\d+)\s*viandas?\b/iu', $name, $m ) ) {
			$per_unit = max( 1, (int) $m[1] );
		} else {
			$per_unit = 1;
			if ( $item->get_product_id() && has_term( [ 'combos', 'Combos' ], 'product_cat', $item->get_product_id() ) ) {
				$review[] = $name;
			}
		}

		$viandas  = $per_unit * $qty;
		$total   += $viandas;
		$items[]  = [
			'name'    => $name,
			'qty'     => $qty,
			'viandas' => $viandas,
		];
	}

	return [
		'total'  => $total,
		'items'  => $items,
		'review' => $review,
	];
}

function homefood_viandas_label( $n ) {
	return 1 === $n ? '1 vianda' : $n . ' viandas';
}

/**
 * Datos del talón, ya en texto plano (se escapan al imprimirlos).
 */
function homefood_talon_data( WC_Order $order ) {
	$use_shipping = $order->has_shipping_address();
	$get          = function ( $field ) use ( $order, $use_shipping ) {
		$value = $use_shipping ? $order->{"get_shipping_{$field}"}() : '';
		return $value ? $value : $order->{"get_billing_{$field}"}();
	};

	$name = trim( $get( 'first_name' ) . ' ' . $get( 'last_name' ) );

	$address = array_filter( [
		$get( 'address_1' ),
		$get( 'address_2' ),
		$get( 'city' ),
		$get( 'postcode' ) ? 'CP ' . $get( 'postcode' ) : '',
	] );

	$phone = $order->get_shipping_phone() ? $order->get_shipping_phone() : $order->get_billing_phone();

	$date = $order->get_date_created();

	return [
		'number'  => $order->get_order_number(),
		'date'    => $date ? wc_format_datetime( $date, 'd/m/Y H:i' ) : '',
		'name'    => $name,
		'phone'   => $phone,
		'address' => implode( ', ', $address ),
		'note'    => trim( (string) $order->get_customer_note() ),
		'slot'    => $order->get_shipping_method(),
		'total'   => html_entity_decode( wp_strip_all_tags( wc_price( $order->get_total(), [ 'currency' => $order->get_currency() ] ) ), ENT_QUOTES, 'UTF-8' ),
		'payment' => $order->get_payment_method_title(),
	];
}

add_action( 'woocommerce_email_after_order_table', function ( $order, $sent_to_admin, $plain_text, $email = null ) {
	if ( ! $order instanceof WC_Order || ! $email || 'new_order' !== $email->id ) {
		return;
	}

	$viandas = homefood_order_viandas( $order );
	$talon   = homefood_talon_data( $order );

	if ( $plain_text ) {
		homefood_email_viandas_plain( $viandas, $talon );
	} else {
		homefood_email_viandas_html( $viandas, $talon );
	}
}, 20, 4 );

function homefood_email_viandas_plain( $viandas, $talon ) {
	echo "\n==========\n";
	echo 'TOTAL DE VIANDAS DEL PEDIDO: ' . esc_html( $viandas['total'] ) . "\n";
	foreach ( $viandas['review'] as $name ) {
		echo 'REVISAR: el combo "' . esc_html( $name ) . "\" no dice cuántas viandas trae; se contó como 1.\n";
	}

	echo "\n- - - - - - - - - - cortar acá - - - - - - - - - -\n\n";
	echo "TALÓN PARA HOMEFOOD\n\n";
	echo 'Pedido #' . esc_html( $talon['number'] ) . ' — ' . esc_html( $talon['date'] ) . "\n";
	echo 'Cliente: ' . esc_html( $talon['name'] ) . "\n";
	echo 'Teléfono: ' . esc_html( $talon['phone'] ) . "\n";
	echo 'Dirección: ' . esc_html( $talon['address'] ) . "\n";
	if ( $talon['note'] ) {
		echo 'Notas: ' . esc_html( $talon['note'] ) . "\n";
	}
	echo 'Entrega: ' . esc_html( $talon['slot'] ) . "\n\n";
	foreach ( $viandas['items'] as $item ) {
		echo esc_html( $item['qty'] ) . ' x ' . esc_html( $item['name'] ) . "\n";
	}
	echo "\nTotal de viandas: " . esc_html( $viandas['total'] ) . "\n";
	echo 'Total: ' . esc_html( $talon['total'] ) . ' (' . esc_html( $talon['payment'] ) . ")\n\n";
	echo "Recibí mis viandas en conformidad.\n\n";
	echo "Firma: ______________________   Aclaración: ______________________\n";
	echo "DNI: ________________   Fecha y hora: ________________\n";
	echo "\n- - - - - - - - - - - - - - - - - - - - - - - - - -\n";
}

function homefood_email_viandas_html( $viandas, $talon ) {
	$font  = "font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1f1f1f;";
	$label = 'padding:3px 10px 3px 0;vertical-align:top;white-space:nowrap;font-weight:600;';
	$cell  = 'padding:3px 0;vertical-align:top;';
	$line  = 'border-bottom:1px solid #1f1f1f;height:34px;';
	$rows  = array_filter( [
		'Cliente'   => $talon['name'],
		'Teléfono'  => $talon['phone'],
		'Dirección' => $talon['address'],
		'Notas'     => $talon['note'],
		'Entrega'   => $talon['slot'],
	], 'strlen' );
	?>
	<table cellspacing="0" cellpadding="0" border="0" width="100%" style="<?php echo esc_attr( $font ); ?>margin:0 0 24px;">
		<tr>
			<td style="background:#fff4d6;border:2px solid #e0a800;padding:14px 16px;font-size:18px;">
				<strong>Total de viandas del pedido: <?php echo esc_html( $viandas['total'] ); ?></strong>
				<?php foreach ( $viandas['review'] as $name ) : ?>
					<div style="margin-top:8px;font-size:14px;color:#a01b1b;">
						<strong>Revisar:</strong> el combo "<?php echo esc_html( $name ); ?>" no dice cuántas viandas trae; se contó como 1.
					</div>
				<?php endforeach; ?>
			</td>
		</tr>
	</table>

	<p style="<?php echo esc_attr( $font ); ?>text-align:center;font-size:12px;color:#777;margin:0 0 6px;">✂ - - - - - - - - - - cortar acá - - - - - - - - - -</p>

	<table cellspacing="0" cellpadding="0" border="0" width="100%" style="<?php echo esc_attr( $font ); ?>border:2px dashed #555;margin:0 0 24px;font-size:14px;line-height:1.4;">
		<tr>
			<td style="padding:16px;">
				<table cellspacing="0" cellpadding="0" border="0" width="100%">
					<tr>
						<td style="font-size:18px;font-weight:700;">Talón para HomeFood</td>
						<td style="text-align:right;">
							<strong>Pedido #<?php echo esc_html( $talon['number'] ); ?></strong><br>
							<?php echo esc_html( $talon['date'] ); ?>
						</td>
					</tr>
				</table>

				<table cellspacing="0" cellpadding="0" border="0" style="margin-top:12px;">
					<?php foreach ( $rows as $key => $value ) : ?>
						<tr>
							<td style="<?php echo esc_attr( $label ); ?>"><?php echo esc_html( $key ); ?>:</td>
							<td style="<?php echo esc_attr( $cell ); ?>"><?php echo nl2br( esc_html( $value ) ); ?></td>
						</tr>
					<?php endforeach; ?>
				</table>

				<table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:12px;border-top:1px solid #ccc;">
					<?php foreach ( $viandas['items'] as $item ) : ?>
						<tr>
							<td style="<?php echo esc_attr( $cell ); ?>width:40px;"><?php echo esc_html( $item['qty'] ); ?> x</td>
							<td style="<?php echo esc_attr( $cell ); ?>"><?php echo esc_html( $item['name'] ); ?></td>
						</tr>
					<?php endforeach; ?>
				</table>

				<table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:8px;border-top:1px solid #ccc;">
					<tr>
						<td style="padding-top:8px;"><strong>Total de viandas: <?php echo esc_html( $viandas['total'] ); ?></strong></td>
						<td style="padding-top:8px;text-align:right;">
							<strong>Total: <?php echo esc_html( $talon['total'] ); ?></strong><br>
							<?php echo esc_html( $talon['payment'] ); ?>
						</td>
					</tr>
				</table>

				<p style="margin:18px 0 4px;font-size:16px;font-weight:700;text-align:center;">Recibí mis viandas en conformidad</p>

				<table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:6px;">
					<tr>
						<td width="48%" style="<?php echo esc_attr( $line ); ?>"></td>
						<td width="4%"></td>
						<td width="48%" style="<?php echo esc_attr( $line ); ?>"></td>
					</tr>
					<tr>
						<td style="font-size:12px;padding-top:3px;">Firma</td>
						<td></td>
						<td style="font-size:12px;padding-top:3px;">Aclaración</td>
					</tr>
					<tr>
						<td style="<?php echo esc_attr( $line ); ?>"></td>
						<td></td>
						<td style="<?php echo esc_attr( $line ); ?>"></td>
					</tr>
					<tr>
						<td style="font-size:12px;padding-top:3px;">DNI</td>
						<td></td>
						<td style="font-size:12px;padding-top:3px;">Fecha y hora</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
	<?php
}
